# PDF Size Reducer

The optional local Django/PyMuPDF engine for Akeluwa ToolBox, located inside `website/pdf-reducer/`. Browser compression lives in `../assets/js/pdf-reducer.js`.

## Windows

Install Python 3.10 or newer with **Add Python to PATH**, then double-click `run_windows.bat`. First-time setup creates or repairs `.venv` and installs the pinned dependencies. The standalone interface opens at `http://127.0.0.1:8000/reducer/` after the service is ready. Keep the launcher open; Ctrl+C stops it.

To run the whole Akeluwa ToolBox, use `start-windows.bat` in the toolbox root. It opens the full site at `http://127.0.0.1:8096`, with the local compression engine integrated into **Compress PDF**.

## Linux/macOS

```sh
sh run_linux_mac.sh
```

Use `sh run_linux_mac.sh --toolbox` when this folder is inside the Akeluwa ToolBox project. The standalone page uses the shared logo and favicon in `../assets/images/`. Keep this folder inside `website/` so those assets remain available.

## Compression

Choose a PDF and a 5-90% reduction target. Preserve-text mode optimizes the PDF structure and embedded images while retaining selectable text, links, and forms. Visual mode can rasterize pages into JPEG images for stronger scan compression. The highest-quality candidate that meets the target is used, or the smallest candidate if the target cannot be reached. A larger output is never returned.

No Ghostscript installation is needed. The engine uses PyMuPDF directly. Results show the actual reduction, page count, and whether pages were flattened. Automatic download is enabled by default; the result remains available for manual download.

Limits: 60 MB, 200 pages, two simultaneous workers, and a 120-second processing timeout. Password-protected and invalid PDFs are rejected. Compression can invalidate digital signatures. Visual compression removes selectable text, links, forms, and accessibility tags; keep your original.

The service binds only to localhost and uses CSRF protection. Uploaded files and worker input/output files are temporary and removed when each request completes or fails. No database or permanent upload directory is used. A disconnected/cancelled browser request can leave its local worker running until completion or timeout.

## API

`GET /api/pdf-reducer/capabilities/` returns the engine, limits, and a CSRF token, setting its cookie. Send that token in `X-CSRFToken` with a same-origin multipart request to `POST /api/pdf-reducer/compress/` containing `file`, `target`, and `mode` (`preserve` or `visual`). The response is a PDF download with JSON metrics in `X-PDF-Result`.

The older `POST /api/compress/` path with fields `pdf` and `percentage` remains supported. It defaults to preserve-text mode and returns the older size/reduction headers alongside the new metrics. The legacy Python module and duplicate UI/assets have been removed; the compatibility endpoint is handled directly by `pdf_reducer.views`.

## Tests

```powershell
.venv\Scripts\python.exe manage.py test
```

On Linux/macOS: `.venv/bin/python manage.py test`.

The 16 backend tests cover valid downloads, text/link/form preservation, scans, rotations, invalid/encrypted files, limits, CSRF, cleanup, worker failures/timeouts, and the older API. Optional browser tests are documented in the toolbox root README. Runtime requirements are pinned in `requirements.txt`; Playwright is only in `requirements-dev.txt`.
