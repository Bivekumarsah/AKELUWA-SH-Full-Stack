"""Compression shared by tests and the isolated worker process."""
from dataclasses import dataclass
import math
import pymupdf

MAX_PAGES = 200
MAX_PIXELS = 8_000_000


class PdfError(ValueError):
    pass


@dataclass
class CompressionResult:
    data: bytes
    original_size: int
    pages: int
    target: int
    method: str
    flattened: bool

    @property
    def reduction(self):
        return round(100 * (1 - len(self.data) / self.original_size), 2)

    @property
    def target_met(self):
        return len(self.data) <= self.original_size * (1 - self.target / 100)


def optimized_bytes(doc):
    return doc.tobytes(garbage=4, deflate=True, deflate_images=True,
                       deflate_fonts=True, use_objstms=1)


def visual_bytes(source, dpi, quality):
    with pymupdf.open() as output:
        for page in source:
            rect = page.rect
            scale = min(dpi / 72, math.sqrt(MAX_PIXELS / (rect.width * rect.height)))
            pix = page.get_pixmap(matrix=pymupdf.Matrix(scale, scale),
                                  colorspace=pymupdf.csRGB, alpha=False, annots=True)
            image = pix.tobytes("jpeg", jpg_quality=quality)
            dest = output.new_page(width=rect.width, height=rect.height)
            dest.insert_image(dest.rect, stream=image)
        return optimized_bytes(output)


def compress_pdf(data, target=50, mode="preserve"):
    if not isinstance(target, int) or isinstance(target, bool) or not 5 <= target <= 90:
        raise PdfError("Choose a reduction target between 5% and 90%.")
    if mode not in {"preserve", "visual"}:
        raise PdfError("Choose preserve or visual compression.")
    if not data or b"%PDF-" not in data[:1024]:
        raise PdfError("This file is not a PDF.")
    try:
        source = pymupdf.open(stream=data, filetype="pdf")
    except Exception as exc:
        raise PdfError("This PDF is damaged or cannot be opened.") from exc
    with source:
        if source.needs_pass:
            raise PdfError("This PDF is password-protected. Unlock it before compressing.")
        if not 1 <= len(source) <= MAX_PAGES:
            raise PdfError(f"Choose a PDF with 1 to {MAX_PAGES} pages.")
        if any(not p.rect.is_valid or p.rect.width > 14400 or p.rect.height > 14400
               for p in source):
            raise PdfError("This PDF has unsupported page dimensions.")
        best, method, flattened = data, "original", False

        def consider(candidate, name, is_flat=False):
            nonlocal best, method, flattened
            if len(candidate) < len(best):
                best, method, flattened = candidate, name, is_flat

        consider(optimized_bytes(source), "optimized")
        target_size = len(data) * (1 - target / 100)
        # Try the highest-quality option first and stop as soon as the target is met.
        presets = [(180, 85), (130, 70), (96, 50)]
        for dpi, quality in presets:
            if len(best) <= target_size:
                break
            if mode == "preserve":
                with pymupdf.open(stream=data, filetype="pdf") as candidate:
                    candidate.rewrite_images(dpi_threshold=dpi + 30, dpi_target=dpi,
                                             quality=quality)
                    consider(optimized_bytes(candidate), "images-optimized")
            else:
                consider(visual_bytes(source, dpi, quality), "visual", True)
        return CompressionResult(best, len(data), len(source), target, method, flattened)
