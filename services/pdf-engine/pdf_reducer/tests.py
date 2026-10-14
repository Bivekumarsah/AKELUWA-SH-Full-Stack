import json
from pathlib import Path
import subprocess
import tempfile
from unittest.mock import patch
import pymupdf
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, SimpleTestCase, override_settings
from .compression import compress_pdf, PdfError


def text_pdf():
    with pymupdf.open() as doc:
        page = doc.new_page(width=400, height=600)
        page.insert_text((40, 50), "Akeluwa selectable text")
        page.insert_link({"kind": pymupdf.LINK_URI, "from": pymupdf.Rect(40, 40, 190, 60),
                          "uri": "https://example.com"})
        widget = pymupdf.Widget()
        widget.field_name = "name"
        widget.field_type = pymupdf.PDF_WIDGET_TYPE_TEXT
        widget.rect = pymupdf.Rect(40, 100, 200, 125)
        widget.field_value = "Preserved value"
        page.add_widget(widget)
        return doc.tobytes()


def scan_pdf():
    with pymupdf.open() as doc:
        pixels = bytearray([240, 235, 220] * (800 * 1000))
        pix = pymupdf.Pixmap(pymupdf.csRGB, 800, 1000, pixels, False)
        for i in range(2):
            page = doc.new_page(width=400, height=500)
            page.insert_image(page.rect, pixmap=pix)
            page.insert_text((40, 50), f"Scanned page {i + 1}")
            if i:
                page.set_rotation(90)
        return doc.tobytes(deflate=False)


class CompressionTests(SimpleTestCase):
    def test_preserves_text_links_and_forms(self):
        original = text_pdf()
        result = compress_pdf(original, 90, "preserve")
        self.assertLessEqual(len(result.data), len(original))
        self.assertFalse(result.flattened)
        with pymupdf.open(stream=result.data, filetype="pdf") as doc:
            self.assertIn("Akeluwa selectable text", doc[0].get_text())
            self.assertEqual(doc[0].get_links()[0]["uri"], "https://example.com")
            self.assertEqual(next(doc[0].widgets()).field_value, "Preserved value")

    def test_scan_reduction_and_rotated_page_dimensions(self):
        result = compress_pdf(scan_pdf(), 75, "visual")
        self.assertTrue(result.target_met)
        self.assertGreater(result.reduction, 75)
        self.assertEqual(result.pages, 2)
        with pymupdf.open(stream=result.data, filetype="pdf") as output:
            self.assertEqual(output[0].rect, pymupdf.Rect(0, 0, 400, 500))
            self.assertEqual(output[1].rect, pymupdf.Rect(0, 0, 500, 400))
            if result.flattened:
                self.assertEqual(output[0].get_text(), "")

    def test_image_optimization_retains_text(self):
        result = compress_pdf(scan_pdf(), 75, "preserve")
        self.assertTrue(result.target_met)
        self.assertFalse(result.flattened)
        with pymupdf.open(stream=result.data, filetype="pdf") as output:
            self.assertIn("Scanned page 1", output[0].get_text())

    def test_never_returns_larger_pdf(self):
        with pymupdf.open() as doc:
            doc.new_page()
            original = doc.tobytes(garbage=4, deflate=True, use_objstms=1)
        for mode in ("preserve", "visual"):
            self.assertLessEqual(len(compress_pdf(original, 90, mode).data), len(original))

    def test_rejects_invalid_and_encrypted_pdf(self):
        for data in (b"", b"not a PDF", b"%PDF-1.7\ncorrupt"):
            with self.assertRaises(PdfError):
                compress_pdf(data)
        with pymupdf.open() as doc:
            doc.new_page()
            data = doc.tobytes(encryption=pymupdf.PDF_ENCRYPT_AES_256, owner_pw="owner", user_pw="password")
        with self.assertRaisesRegex(PdfError, "password-protected"):
            compress_pdf(data)

    def test_rejects_page_limit_and_invalid_options(self):
        with pymupdf.open() as doc:
            for _ in range(201):
                doc.new_page()
            with self.assertRaisesRegex(PdfError, "200 pages"):
                compress_pdf(doc.tobytes())
        for target, mode in ((0, "preserve"), (91, "visual"), (True, "preserve"), (50, "other")):
            with self.assertRaises(PdfError):
                compress_pdf(text_pdf(), target, mode)


class ApiTests(SimpleTestCase):
    def upload(self, data=None, **options):
        return self.client.post("/api/pdf-reducer/compress/", {
            "file": SimpleUploadedFile('my "document".pdf', text_pdf() if data is None else data,
                                       content_type="application/pdf"),
            "target": "50", "mode": "preserve", **options,
        })

    def test_pdf_download_and_temp_cleanup(self):
        directories = []
        real_temp = tempfile.TemporaryDirectory
        def tracked(*args, **kwargs):
            directory = real_temp(*args, **kwargs)
            directories.append(Path(directory.name))
            return directory
        with patch("pdf_reducer.views.tempfile.TemporaryDirectory", side_effect=tracked):
            response = self.upload()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertEqual(response["Cache-Control"], "no-store")
        self.assertIn('filename="my-document-compressed.pdf"', response["Content-Disposition"])
        self.assertEqual(json.loads(response["X-PDF-Result"])["pages"], 1)
        self.assertTrue(directories)
        self.assertTrue(all(not d.exists() for d in directories))
        with pymupdf.open(stream=response.content, filetype="pdf") as doc:
            self.assertIn("Akeluwa", doc[0].get_text())

    def test_invalid_upload_and_options(self):
        for data in (b"not a pdf", b"%PDF-1.7\ncorrupt", b""):
            self.assertEqual(self.upload(data).status_code, 400)
        for options in ({"target": "abc"}, {"target": "91"}, {"mode": "other"}):
            self.assertEqual(self.upload(**options).status_code, 400)
        self.assertEqual(self.client.post("/api/pdf-reducer/compress/").status_code, 400)
        self.assertEqual(self.client.get("/api/pdf-reducer/compress/").status_code, 405)

    @override_settings(MAX_PDF_BYTES=100)
    def test_upload_limit_is_enforced_during_streaming(self):
        self.assertEqual(self.upload(b"%PDF-" + b"x" * 101).status_code, 413)

    def test_csrf_enforced_and_capabilities_issues_token(self):
        client = Client(enforce_csrf_checks=True)
        self.assertEqual(client.post("/api/pdf-reducer/compress/").status_code, 403)
        response = client.get("/api/pdf-reducer/capabilities/")
        self.assertEqual(response.json()["engine"], "pymupdf")
        self.assertIn("csrftoken", response.cookies)
        response = client.post("/api/pdf-reducer/compress/", {
            "file": SimpleUploadedFile("test.pdf", text_pdf()), "target": "50", "mode": "preserve",
        }, HTTP_X_CSRFTOKEN=response.json()["csrf_token"])
        self.assertEqual(response.status_code, 200)

    def test_timeout_cleanup_and_worker_failure(self):
        with patch("pdf_reducer.views.subprocess.run", side_effect=subprocess.TimeoutExpired("worker", 120)):
            self.assertEqual(self.upload().status_code, 408)
        with patch("pdf_reducer.views.subprocess.run", side_effect=subprocess.CalledProcessError(1, "worker")):
            self.assertEqual(self.upload().status_code, 500)
        self.assertEqual(self.upload().status_code, 200)

    def test_busy_response(self):
        with patch("pdf_reducer.views.JOBS.acquire", return_value=False):
            response = self.upload()
        self.assertEqual(response.status_code, 429)
        self.assertEqual(response["Retry-After"], "5")

    def test_toolbox_assets_and_standalone_page(self):
        for url in ("/", "/reducer/", "/assets/css/design.css", "/assets/js/pdf-reducer.js",
                    "/assets/js/photo-reducer.js", "/assets/images/favicon.svg",
                    "/assets/images/favicon.png", "/assets/images/logo.png"):
            response = self.client.get(url)
            self.assertEqual(response.status_code, 200, url)
            response.close()
        for url in ("/manage.py", "/pdf-reducer/manage.py",
                    "/pdf-reducer/.venv/pyvenv.cfg", "/assets/../pdf-reducer/manage.py"):
            self.assertEqual(self.client.get(url).status_code, 404, url)
        with tempfile.TemporaryDirectory() as empty:
            with override_settings(TOOLBOX_DIR=Path(empty)):
                self.assertContains(self.client.get("/"), "PDF size reducer")


class PdfCompressorTests(SimpleTestCase):
    def create_pdf(self):
        with pymupdf.open() as document:
            page = document.new_page()
            page.insert_text((72, 72), "PDF Size Reducer test document")
            return document.tobytes()

    def test_home_page_loads(self):
        response = Client().get("/reducer/")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "PDF size reducer")

    def test_pdf_can_be_uploaded_and_downloaded(self):
        uploaded = SimpleUploadedFile(
            "sample.pdf",
            self.create_pdf(),
            content_type="application/pdf",
        )

        response = Client().post(
            "/api/compress/",
            {"pdf": uploaded, "percentage": "25"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertTrue(response.content.startswith(b"%PDF-"))

        with pymupdf.open(stream=response.content, filetype="pdf") as document:
            self.assertEqual(document.page_count, 1)

    def test_non_pdf_is_rejected(self):
        uploaded = SimpleUploadedFile(
            "notes.txt",
            b"This is not a PDF.",
            content_type="text/plain",
        )

        response = Client().post(
            "/api/compress/",
            {"pdf": uploaded, "percentage": "50"},
        )

        self.assertEqual(response.status_code, 400)
