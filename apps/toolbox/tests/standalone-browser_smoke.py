"""Run with the reducer's Python environment; uses installed Chrome or Edge.

Installs no browser. Starts and stops its own local and static test servers.
Generated fixtures, downloaded results, and screenshots go into .preview/reducer.
"""
from contextlib import contextmanager
import json
from pathlib import Path
import random
import socket
import subprocess
import sys
import time
import urllib.request
import pymupdf
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "website" / "pdf-reducer"
ARTIFACTS = ROOT / ".preview" / "reducer"
ARTIFACTS.mkdir(parents=True, exist_ok=True)


def fixtures():
    with pymupdf.open() as doc:
        page = doc.new_page(width=400, height=600)
        page.insert_text((40, 60), "Selectable text retained by compression")
        page.insert_link({"kind": pymupdf.LINK_URI, "from": pymupdf.Rect(40, 40, 190, 65), "uri": "https://example.com"})
        widget = pymupdf.Widget()
        widget.field_name = "name"
        widget.field_type = pymupdf.PDF_WIDGET_TYPE_TEXT
        widget.rect = pymupdf.Rect(40, 100, 200, 125)
        widget.field_value = "Preserved value"
        page.add_widget(widget)
        doc.save(ARTIFACTS / "text.pdf")
        doc.save(ARTIFACTS / "locked.pdf", encryption=pymupdf.PDF_ENCRYPT_AES_256,
                 user_pw="secret", owner_pw="owner")
    with pymupdf.open() as doc:
        pix = pymupdf.Pixmap(pymupdf.csRGB, 800, 1000, random.Random(42).randbytes(800 * 1000 * 3), False)
        for n in range(2):
            page = doc.new_page(width=400, height=500)
            page.insert_image(page.rect, pixmap=pix)
            page.insert_text((30, 40), f"Scan {n + 1}")
            if n:
                page.set_rotation(90)
        doc.save(ARTIFACTS / "scan.pdf", deflate=False)
    (ARTIFACTS / "invalid.pdf").write_bytes(b"This is not a PDF.")
    with pymupdf.open() as doc:
        for _ in range(201):
            doc.new_page()
        doc.save(ARTIFACTS / "too-many-pages.pdf")


@contextmanager
def server(local):
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
    if not local:
        subprocess.run(["node", str(ROOT / "scripts" / "build-static.mjs")], cwd=ROOT, check=True)
    command = [sys.executable, str(APP / "manage.py"), "runserver", f"127.0.0.1:{port}", "--noreload"] if local else [sys.executable, "-m", "http.server", str(port), "--bind", "127.0.0.1", "--directory", str(ROOT / "dist")]
    with (ARTIFACTS / ("local-server.log" if local else "static-server.log")).open("w") as log:
        process = subprocess.Popen(command, cwd=APP, stdout=log, stderr=log,
                                   creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0)
        try:
            for _ in range(100):
                try:
                    urllib.request.urlopen(f"http://127.0.0.1:{port}/", timeout=.5).close()
                    break
                except OSError:
                    if process.poll() is not None:
                        raise RuntimeError("Test server exited; inspect its log.")
                    time.sleep(.1)
            else:
                raise RuntimeError("Test server did not start.")
            yield f"http://127.0.0.1:{port}"
        finally:
            process.terminate()
            process.wait(timeout=10)


def download_result(page, name):
    with page.expect_download() as event:
        page.locator("#reduceDownload").click()
    path = ARTIFACTS / name
    event.value.save_as(path)
    return path


def screenshot_at_top(page, name):
    page.evaluate("document.activeElement?.blur(); document.documentElement.style.scrollBehavior='auto'; window.scrollTo({top:0,behavior:'instant'}); document.getElementById('toast')?.classList.remove('show')")
    page.screenshot(path=str(ARTIFACTS / name), full_page=True)


def compress(page, fixture, mode="preserve", target=75):
    page.locator("#reduceInput").set_input_files(ARTIFACTS / fixture)
    expect(page.locator("#reduceRun")).to_be_enabled(timeout=20000)
    page.locator("#reduceAutomatic").uncheck()
    page.locator("#reduceVisual" if mode == "visual" else "#reducePreserve").check()
    page.locator("#reduceTarget").fill(str(target))
    page.locator("#reduceRun").click()
    expect(page.locator("#reduceResult")).to_be_visible(timeout=120000)
    return download_result(page, f"{fixture[:-4]}-{mode}-{target}-{page.url.split(':')[2].split('/')[0]}.pdf")


def main():
    fixtures()
    checks = []
    with sync_playwright() as pw, server(True) as local, server(False) as static:
        browser = pw.chromium.launch(channel="chrome", headless=True)
        context = browser.new_context(accept_downloads=True, viewport={"width": 1440, "height": 1000})
        context.route("https://cdnjs.cloudflare.com/**", lambda route: route.abort())
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(local + "/?tool=reducer")
        expect(page.locator("#reducerTool")).to_be_visible()
        expect(page.locator("#reduceEngine")).to_have_text("Processing on this computer")
        result = compress(page, "text.pdf")
        with pymupdf.open(result) as doc:
            assert "Selectable text" in doc[0].get_text()
            assert doc[0].get_links()[0]["uri"] == "https://example.com"
            assert next(doc[0].widgets()).field_value == "Preserved value"
        checks.append("Local toolbox compression preserves text, links, and forms")
        result = compress(page, "scan.pdf", "visual", 75)
        assert result.stat().st_size < (ARTIFACTS / "scan.pdf").stat().st_size
        with pymupdf.open(result) as doc:
            assert len(doc) == 2
            assert doc[1].rect == pymupdf.Rect(0, 0, 500, 400)
        screenshot_at_top(page, "desktop.png")
        checks.append("Local scan compression and rotated pages")

        page.goto(local + "/reducer/")
        page.locator("#file").set_input_files(ARTIFACTS / "text.pdf")
        with page.expect_download() as event:
            page.locator("#run").click()
        event.value.save_as(ARTIFACTS / "standalone.pdf")
        expect(page.locator("#result")).to_be_visible()
        checks.append("Standalone reducer and automatic download")

        page.goto(static + "/?tool=reducer")
        expect(page.locator("#reducerTool")).to_be_visible()
        expect(page.locator("#reduceEngine")).to_have_text("Processing in your browser")
        posts = []
        page.on("request", lambda request: posts.append(request.url) if request.method == "POST" else None)
        result = compress(page, "text.pdf", "preserve", 90)
        with pymupdf.open(result) as doc:
            assert "Selectable text" in doc[0].get_text()
            assert doc[0].get_links()[0]["uri"] == "https://example.com"
            assert next(doc[0].widgets()).field_value == "Preserved value"
        checks.append("Static browser compression preserves text, links, and forms")
        result = compress(page, "scan.pdf", "visual", 75)
        with pymupdf.open(result) as doc:
            assert len(doc) == 2
            assert doc[0].get_text() == ""
            assert doc[1].rect == pymupdf.Rect(0, 0, 500, 400)
        assert result.stat().st_size < .25 * (ARTIFACTS / "scan.pdf").stat().st_size
        assert not posts, f"Browser engine uploaded files: {posts}"
        checks.append("Browser visual compression exceeds 75% savings without uploads")
        page.locator('[data-reduction="25"]').click()
        expect(page.locator("#reduceResult")).to_be_hidden()
        expect(page.locator("#reduceTargetValue")).to_have_text("25%")
        checks.append("Changing settings clears stale results")
        for fixture, message in (("invalid.pdf", "damaged"), ("locked.pdf", "password-protected"), ("too-many-pages.pdf", "200 pages")):
            page.locator("#reduceInput").set_input_files(ARTIFACTS / fixture)
            expect(page.locator("#reduceStatus")).to_contain_text(message, timeout=20000)
            expect(page.locator("#reduceRun")).to_be_disabled()
        checks.append("Invalid, encrypted, and over-limit PDFs rejected in browser")
        page.locator("#reduceInput").set_input_files(ARTIFACTS / "scan.pdf")
        expect(page.locator("#reduceRun")).to_be_enabled(timeout=20000)
        page.locator("#reduceVisual").check()
        # Cancel immediately; fast jobs can finish while Playwright scrolls to Cancel.
        page.evaluate("() => { document.getElementById('reduceRun').click(); document.getElementById('reduceCancel').click(); }")
        expect(page.locator("#reduceStatus")).to_contain_text("cancelled", timeout=20000)
        expect(page.locator("#reduceRun")).to_be_enabled()
        page.locator("#reduceClear").click()
        expect(page.locator("#reduceFile")).to_have_text("No PDF selected")
        checks.append("Cancel and clear restore the workspace")

        # Verify the new tool does not break existing navigation and PDF actions.
        page.locator('[data-tool="pdf"]').click()
        expect(page.locator("#pdfTool")).to_be_visible()
        page.locator("#pdfInput").set_input_files(ARTIFACTS / "text.pdf")
        expect(page.locator("#exportBtn")).to_be_enabled(timeout=20000)
        with page.expect_download() as event:
            page.locator("#exportBtn").click()
        event.value.save_as(ARTIFACTS / "editor-export.pdf")
        page.locator('[data-tool="converter"]').click()
        expect(page.locator("#converterTool")).to_be_visible()
        page.locator("#pdfMergeInput").set_input_files([ARTIFACTS / "text.pdf", ARTIFACTS / "scan.pdf"])
        with page.expect_download() as event:
            page.locator("#mergePdfsBtn").click()
        event.value.save_as(ARTIFACTS / "merged.pdf")
        with pymupdf.open(ARTIFACTS / "merged.pdf") as doc:
            assert len(doc) == 3
        page.locator('[data-tool="background"]').click()
        expect(page.locator("#backgroundTool")).to_be_visible()
        page.locator('[data-tool="home"]').click()
        page.locator('.tool-card[data-launch-tool="reducer"]').click()
        expect(page.locator("#reducerTool")).to_be_visible()
        checks.append("Existing editor export, merge, and all tool navigation")
        for width in (375, 768, 1024, 1440):
            page.set_viewport_size({"width": width, "height": 900})
            assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), f"Overflow at {width}px"
        page.set_viewport_size({"width": 375, "height": 900})
        screenshot_at_top(page, "mobile.png")
        checks.append("375, 768, 1024, and 1440px layouts fit without overflow")
        assert not errors, errors
        browser.close()
    report = {"checks": checks, "count": len(checks), "browser_errors": errors}
    (ARTIFACTS / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
