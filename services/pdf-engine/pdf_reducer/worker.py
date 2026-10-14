"""Run native PDF processing outside Django's threads with a bounded lifetime."""
import json
import sys
from pathlib import Path
from .compression import compress_pdf, PdfError


def main():
    source, output, report, target, mode = sys.argv[1:]
    try:
        result = compress_pdf(Path(source).read_bytes(), int(target), mode)
        Path(output).write_bytes(result.data)
        metadata = {
            "pages": result.pages, "original_size": result.original_size,
            "output_size": len(result.data), "reduction": result.reduction,
            "target_met": result.target_met, "method": result.method,
            "flattened": result.flattened,
        }
    except PdfError as exc:
        metadata = {"error": str(exc)}
    except Exception:
        metadata = {"error": "Could not compress this PDF. Try another file or mode."}
    Path(report).write_text(json.dumps(metadata), encoding="utf-8")


if __name__ == "__main__":
    main()
