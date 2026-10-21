"""Check published HTML, domain changes, and tool navigation in installed Chrome."""
import json
import os
import struct
from pathlib import Path
import subprocess
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from playwright.sync_api import sync_playwright, expect
from browser_smoke import server

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = "https://akeluwatoolbox-website.vercel.app"
ROUTES = {
    "/": "#homeTool", "/pdf-editor/": "#pdfTool", "/compress-pdf/": "#reducerTool",
    "/compress-photo/": "#photoTool", "/pdf-converter/": "#converterTool",
    "/jpg-to-pdf/": "#image-to-pdf", "/pdf-to-png/": "#pdf-to-image",
    "/merge-pdf/": "#merge-pdfs", "/extract-pdf-pages/": "#extract-pages",
    "/remove-background/": "#backgroundTool",
}


EXTRA_TOOL_SLUGS = ["photo-signature-resizer","pdf-to-word","pdf-esign-watermark","ocr-text-extractor","unicode-preeti","resume-builder","image-format-converter","qr-code-generator","pdf-page-numbers","bulk-image-compressor"]

class Metadata(HTMLParser):
    def __init__(self):
        super().__init__()
        self.canonical = None
        self.meta = {}
        self.links = []
        self.icons = {}
        self.structured = ""
        self.title = ""
        self.capture = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "meta":
            self.meta[attrs.get("name") or attrs.get("property")] = attrs.get("content")
        if tag == "link" and attrs.get("rel") == "canonical":
            self.canonical = attrs["href"]
        if tag == "link" and attrs.get("rel") in {"icon", "apple-touch-icon"}:
            self.icons[attrs["rel"]] = attrs
        if tag == "a":
            self.links.append(attrs.get("href"))
        if tag == "title":
            self.capture = "title"
        if tag == "script" and attrs.get("type") == "application/ld+json":
            self.capture = "structured"

    def handle_endtag(self, tag):
        if tag in {"script", "title"}:
            self.capture = None

    def handle_data(self, data):
        if self.capture:
            setattr(self, self.capture, getattr(self, self.capture) + data)


def inspect(html, path, origin=ORIGIN):
    metadata = Metadata()
    metadata.feed(html)
    assert metadata.canonical == origin + path, (path, metadata.canonical)
    assert metadata.meta["og:url"] == metadata.canonical
    assert metadata.meta["description"] and metadata.title
    assert "localhost" not in html
    assert "<h2 id=\"guideTitle\">" in html
    graph = json.loads(metadata.structured)["@graph"]
    assert graph[0]["url"] == metadata.canonical
    webpage = next(node for node in graph if node["@type"] == "WebPage")
    assert webpage["url"] == metadata.canonical
    assert webpage["mainEntity"]["@id"] == graph[0]["@id"]
    assert webpage["isPartOf"]["@id"] == origin + "/#website"
    return metadata


def main():
    checks, errors = [], []
    with sync_playwright() as pw, server(False) as static, server(True) as local:
        titles, descriptions = set(), set()
        for path in ROUTES:
            html = urllib.request.urlopen(static + path).read().decode("utf-8")
            metadata = inspect(html, path)
            titles.add(metadata.title)
            descriptions.add(metadata.meta["description"])
            assert "index, follow" == metadata.meta["robots"]
            assert metadata.meta["og:image"] == ORIGIN + "/assets/images/logo.png"
            assert metadata.icons["icon"]["sizes"] == "192x192"
        assert len(titles) == len(ROUTES) and len(descriptions) == len(ROUTES)
        checks.append("Ten published pages have unique titles/descriptions, self-canonicals, guides, and valid structured data")
        sitemap = ET.fromstring(urllib.request.urlopen(static + "/sitemap.xml").read())
        urls = {node.text for node in sitemap.findall("{*}url/{*}loc")}
        assert urls == {ORIGIN + path for path in ROUTES} | {ORIGIN + '/extra-tools/'} | {ORIGIN + '/extra-tools/' + slug + '/' for slug in EXTRA_TOOL_SLUGS}
        robots = urllib.request.urlopen(static + "/robots.txt").read().decode()
        assert "Allow: /" in robots and ORIGIN + "/sitemap.xml" in robots
        for base in (static, local):
            metadata = inspect(urllib.request.urlopen(base + "/").read().decode("utf-8"), "/")
            with urllib.request.urlopen(base + metadata.icons["icon"]["href"]) as response:
                assert response.headers.get_content_type() == "image/png"
                icon = response.read()
            assert icon[:8] == b"\x89PNG\r\n\x1a\n"
            assert struct.unpack(">II", icon[16:24]) == (192, 192)
            assert icon[25] == 6, "The favicon must retain RGBA transparency"
            manifest = json.loads(urllib.request.urlopen(base + "/site.webmanifest").read())
            assert manifest["name"] == manifest["short_name"] == metadata.meta["og:site_name"] == metadata.meta["application-name"]
            assert manifest["icons"][0]["src"] == metadata.icons["icon"]["href"] == metadata.icons["apple-touch-icon"]["href"]
            assert manifest["icons"][0]["sizes"] == "192x192"
            website = next(node for node in json.loads(metadata.structured)["@graph"] if node["@type"] == "WebSite")
            assert website["name"] == manifest["name"]
            assert "akeluwatoolbox-website.vercel.app" in website["alternateName"]
            for asset in ("pdf-lib/pdf-lib.min.js", "pdfjs/pdf.min.js", "pdfjs/pdf.worker.min.js"):
                with urllib.request.urlopen(base + "/assets/vendor/" + asset) as response:
                    assert response.headers.get_content_type() in {"text/javascript", "application/javascript"}, (base, asset, response.headers)
            verification = urllib.request.urlopen(base + "/googlefb3975d72926d897.html").read().decode().strip()
            assert verification == "google-site-verification: googlefb3975d72926d897.html"
            try:
                urllib.request.urlopen(base + "/this-page-does-not-exist/")
            except urllib.error.HTTPError as error:
                assert error.code == 404
            else:
                raise AssertionError("Unknown paths should return 404")
        checks.append("Sitemap and robots use the production address; ownership verification is accessible; unknown paths return 404")
        checks.append("Local and static sites serve a square transparent PNG; manifest, icon declarations, and preferred site name agree")
        browser = pw.chromium.launch(channel="chrome", headless=True)
        nojs = browser.new_context(java_script_enabled=False)
        page = nojs.new_page()
        page.goto(static + "/")
        assert "AkeluwaToolBox" in page.locator(".hero-description").inner_text()
        assert page.locator("a.tool-card[href]").count() == 7
        page.locator('.tool-card[href="/compress-pdf/"]').click()
        expect(page).to_have_url(static + "/compress-pdf/")
        expect(page.locator("#reducerTool")).to_be_visible()
        expect(page.locator("#toolGuide")).to_contain_text("For a 4 MB PDF")
        page.locator('.breadcrumbs a[href="/"]').click()
        expect(page.locator("#homeTool")).to_be_visible()
        for path, selector in ROUTES.items():
            page.goto(static + path)
            expect(page.locator(selector)).to_be_visible()
            expect(page.locator("#toolGuide")).to_be_visible()
            assert page.locator("h1:visible").count() == 1, path
            if path in {"/jpg-to-pdf/", "/pdf-to-png/", "/merge-pdf/", "/extract-pdf-pages/"}:
                expect(page.locator("#converterTitle")).to_have_text(inspect(page.content(), path).title.split(" | ")[0])
        nojs.close()
        checks.append("Tool content and instructions are visible in static HTML with JavaScript disabled")
        checks.append("Home tool cards and breadcrumbs work without JavaScript; brand text and practical examples are visible")
        context = browser.new_context(viewport={"width": 1440, "height": 1000})
        context.route("https://cdnjs.cloudflare.com/**", lambda route: route.abort())
        page = context.new_page()
        page.on("pageerror", lambda error: errors.append(str(error)))
        for base in (static, local):
            for path, selector in ROUTES.items():
                page.goto(base + path)
                expect(page.locator(selector)).to_be_visible()
                expect(page.locator("#toolGuide")).to_be_visible()
                expect(page.locator('link[rel="canonical"]')).to_have_attribute("href", ORIGIN + path)
                if path in {"/jpg-to-pdf/", "/pdf-to-png/", "/merge-pdf/", "/extract-pdf-pages/"}:
                    assert page.locator(".converter-panel:visible").count() == 1
            page.goto(base + "/")
            page.locator('.tool-card[href="/compress-pdf/"]').click()
            page.locator("#reduceTarget").fill("65")
            page.locator('.brand[href="/"]').click()
            page.locator('.tool-card[href="/compress-pdf/"]').click()
            expect(page.locator("#reduceTarget")).to_have_value("65")
            page.locator('.breadcrumbs a[href="/"]').click()
            expect(page.locator("#homeTool")).to_be_visible()
            page.locator('[data-tool="photo"]').click()
            expect(page).to_have_url(base + "/compress-photo/")
            expect(page.locator("#photoTool")).to_be_visible()
            page.locator('[data-tool="reducer"]').click()
            expect(page).to_have_url(base + "/compress-pdf/")
            page.go_back()
            expect(page.locator("#photoTool")).to_be_visible()
            expect(page.locator('link[rel="canonical"]')).to_have_attribute("href", ORIGIN + "/compress-photo/")
            page.reload()
            expect(page.locator("#photoTool")).to_be_visible()
            page.goto(base + "/merge-pdf/?tool=photo")
            expect(page.locator("#merge-pdfs")).to_be_visible()
            expect(page.locator('link[rel="canonical"]')).to_have_attribute("href", ORIGIN + "/merge-pdf/")
            expect(page.locator("#converterTitle")).to_have_text("Merge PDF Files Online for Free")
            page.locator('#toolGuide a[href="/jpg-to-pdf/"]').click()
            expect(page.locator("#converterTitle")).to_have_text("Convert JPG & PNG Images to PDF Online")
            page.go_back()
            expect(page.locator("#converterTitle")).to_have_text("Merge PDF Files Online for Free")
        checks.append("Every local/static tool route, converter panel, navigation, browser Back, and reload works with the external PDF CDN blocked")
        for path in ("/", "/compress-photo/", "/compress-pdf/", "/jpg-to-pdf/"):
            page.goto(static + path)
            for width in (320, 375, 768, 1440):
                page.set_viewport_size({"width": width, "height": 900})
                assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), (path, width)
        checks.append("Guides and tool pages fit 320–1440 pixel layouts")
        assert not errors, errors
        browser.close()
    # Build from the isolated website root with a future custom domain.
    environment = os.environ.copy()
    environment["SITE_URL"] = "https://tools.example.org"
    environment.pop("VERCEL_ENV", None)
    subprocess.run(["node", "scripts/build-static.mjs"], cwd=ROOT / "website", env=environment, check=True)
    output = ROOT / "website" / "dist"
    for path in ROUTES:
        inspect((output / path.lstrip("/") / "index.html").read_text(encoding="utf-8"), path, "https://tools.example.org")
    assert ORIGIN not in (output / "sitemap.xml").read_text(encoding="utf-8")
    assert "pdf-reducer" not in {path.name for path in output.iterdir()}
    checks.append("SITE_URL updates every page and sitemap for a custom domain while keeping the Python service out of public output")
    environment["VERCEL_ENV"] = "preview"
    subprocess.run(["node", "scripts/build-static.mjs"], cwd=ROOT / "website", env=environment, check=True)
    metadata = inspect((output / "index.html").read_text(encoding="utf-8"), "/", "https://tools.example.org")
    assert metadata.meta["robots"] == "noindex, follow"
    assert "Disallow: /" in (output / "robots.txt").read_text(encoding="utf-8")
    checks.append("Vercel preview builds discourage indexing")
    environment["SITE_URL"] = "https://tools.example.org/invalid-path"
    invalid = subprocess.run(["node", "scripts/build-static.mjs"], cwd=ROOT / "website", env=environment, capture_output=True)
    assert invalid.returncode and "SITE_URL" in invalid.stderr.decode()
    assert (output / "index.html").is_file()
    checks.append("Invalid domain settings fail before deleting existing build output")
    report = {"checks": checks, "javascript_errors": errors}
    artifact = ROOT / ".preview" / "seo"
    artifact.mkdir(parents=True, exist_ok=True)
    (artifact / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
