import json
import re
import subprocess
import sys
import tempfile
import threading
from pathlib import Path
from django.conf import settings
from django.core.exceptions import RequestDataTooBig, TooManyFilesSent, TooManyFieldsSent
from django.http import FileResponse, HttpResponse, JsonResponse, Http404
from django.middleware.csrf import get_token
from django.shortcuts import render
from django.views.decorators.http import require_GET, require_POST

JOBS = threading.BoundedSemaphore(2)
ASSETS = {
    "assets/css/design.css", "assets/js/pdf-reducer.js", "assets/js/photo-reducer.js", "assets/js/seo.js",
    "assets/images/favicon.svg", "assets/images/favicon.png", "assets/images/logo.png",
    "assets/vendor/pdf-lib/pdf-lib.min.js", "assets/vendor/pdfjs/pdf.min.js",
    "assets/vendor/pdfjs/pdf.worker.min.js",
    "robots.txt", "sitemap.xml", "site.webmanifest",
    "googlefb3975d72926d897.html",
}
TOOL_PATHS = {"pdf-editor/", "compress-pdf/", "compress-photo/", "pdf-converter/",
              "jpg-to-pdf/", "pdf-to-png/", "merge-pdf/", "extract-pdf-pages/", "remove-background/"}


def no_store(response):
    response["Cache-Control"] = "no-store"
    return response


def csrf_failure(request, reason=""):
    return no_store(JsonResponse({"error": "Refresh the page and try again."}, status=403))


@require_GET
def home(request):
    if settings.TOOLBOX_DIR.joinpath("index.html").is_file():
        return FileResponse(settings.TOOLBOX_DIR.joinpath("index.html").open("rb"),
                            content_type="text/html; charset=utf-8")
    return standalone(request)


@require_GET
def standalone(request):
    return no_store(render(request, "reducer.html"))


@require_GET
def asset(request, name):
    if name in TOOL_PATHS:
        return home(request)
    if name not in ASSETS:
        raise Http404
    path = settings.TOOLBOX_DIR / name
    if not path.is_file():
        raise Http404
    # Serve module scripts with a consistent MIME type across operating systems.
    if path.suffix == ".js":
        return FileResponse(path.open("rb"), content_type="text/javascript")
    return FileResponse(path.open("rb"))


@require_GET
def capabilities(request):
    return no_store(JsonResponse({"engine": "pymupdf", "max_bytes": settings.MAX_PDF_BYTES,
                                  "max_pages": 200, "csrf_token": get_token(request)}))


@require_POST
def compress(request):
    try:
        if int(request.META.get("CONTENT_LENGTH") or 0) > settings.MAX_PDF_BYTES + 65536:
            return no_store(JsonResponse({"error": "Maximum PDF size is 60 MB."}, status=413))
        files = request.FILES
        if getattr(request, "pdf_upload_too_large", False):
            return no_store(JsonResponse({"error": "Maximum PDF size is 60 MB."}, status=413))
        upload = files.get("file") or files.get("pdf")
        if not upload or not upload.size:
            return no_store(JsonResponse({"error": "Choose a PDF file."}, status=400))
        if upload.size > settings.MAX_PDF_BYTES:
            return no_store(JsonResponse({"error": "Maximum PDF size is 60 MB."}, status=413))
        target = int(request.POST.get("target", request.POST.get("percentage", "50")))
        mode = request.POST.get("mode", "preserve")
        if not 5 <= target <= 90 or mode not in {"preserve", "visual"}:
            raise ValueError
    except (ValueError, RequestDataTooBig, TooManyFilesSent, TooManyFieldsSent):
        return no_store(JsonResponse({"error": "Use one PDF, a 5–90% target, and a valid mode."}, status=400))
    if not JOBS.acquire(blocking=False):
        response = JsonResponse({"error": "The reducer is busy. Try again shortly."}, status=429)
        response["Retry-After"] = "5"
        return no_store(response)
    try:
        # Both input and output disappear on success, error, or timeout.
        with tempfile.TemporaryDirectory(prefix="akeluwa-pdf-") as directory:
            source, output, report = [Path(directory) / n for n in ("input.pdf", "output.pdf", "report.json")]
            with source.open("wb") as handle:
                for chunk in upload.chunks():
                    handle.write(chunk)
            subprocess.run(
                [sys.executable, "-m", "pdf_reducer.worker", str(source), str(output),
                 str(report), str(target), mode],
                cwd=settings.BASE_DIR, timeout=120, check=True, capture_output=True,
                creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0,
            )
            metadata = json.loads(report.read_text(encoding="utf-8"))
            if "error" in metadata:
                return no_store(JsonResponse(metadata, status=400))
            result = output.read_bytes()
        filename = re.sub(r"[^a-zA-Z0-9_-]+", "-", Path(upload.name).stem).strip("-")[:100] or "document"
        response = HttpResponse(result, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}-compressed.pdf"'
        response["X-PDF-Result"] = json.dumps(metadata)
        response["X-Requested-Reduction"] = str(target)
        response["X-Actual-Reduction"] = str(metadata["reduction"])
        response["X-Original-Size"] = str(metadata["original_size"])
        response["X-Final-Size"] = str(metadata["output_size"])
        response["X-Compression-Engine"] = "pymupdf"
        response["X-Visual-Compression"] = str(metadata["flattened"]).lower()
        return no_store(response)
    except subprocess.TimeoutExpired:
        return no_store(JsonResponse({"error": "This PDF took too long. Try fewer pages."}, status=408))
    except (subprocess.SubprocessError, OSError, ValueError):
        return no_store(JsonResponse({"error": "Compression failed. Try another PDF."}, status=500))
    finally:
        JOBS.release()
