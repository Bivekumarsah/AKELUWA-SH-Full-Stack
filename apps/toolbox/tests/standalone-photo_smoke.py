"""Functional photo-reducer checks in installed Chrome, for local/static hosting.

Run from the toolbox root using the reducer's Python environment.
"""
import json
from pathlib import Path
import struct
import sys
import pymupdf
from playwright.sync_api import sync_playwright, expect
from browser_smoke import server

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / ".preview" / "photo"
OUT.mkdir(parents=True, exist_ok=True)


def make_fixtures(page):
    # A detailed synthetic landscape exercises actual encoding, rather than mocks.
    images = page.evaluate("""async () => {
      const canvas = document.createElement('canvas'); canvas.width=1800; canvas.height=1200;
      const ctx=canvas.getContext('2d'), gradient=ctx.createLinearGradient(0,0,0,1200);
      gradient.addColorStop(0,'#7ab0d7'); gradient.addColorStop(.5,'#d6e8e9'); gradient.addColorStop(1,'#426b50');
      ctx.fillStyle=gradient;ctx.fillRect(0,0,1800,1200);
      ctx.fillStyle='#efd9a4';ctx.beginPath();ctx.arc(1320,250,90,0,Math.PI*2);ctx.fill();
      for(let layer=0;layer<4;layer++){
        ctx.fillStyle=['#a0b7ac','#708f7b','#456955','#254c3b'][layer];
        ctx.beginPath();ctx.moveTo(0,600+layer*130);
        for(let x=0;x<=1800;x+=10)ctx.lineTo(x,600+layer*130+Math.sin(x/220+layer*1.7)*100);
        ctx.lineTo(1800,1200);ctx.lineTo(0,1200);ctx.fill();
      }
      const pixels=ctx.getImageData(0,0,1800,1200);let seed=42;
      for(let i=0;i<pixels.data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)|0;const noise=((seed>>>24)-128)*.35;for(let j=0;j<3;j++)pixels.data[i+j]+=noise;}
      ctx.putImageData(pixels,0,0);
      const photo=canvas.toDataURL('image/png'),jpeg=canvas.toDataURL('image/jpeg',.97);
      canvas.width=160;canvas.height=120;ctx.fillStyle='#eb4d40';ctx.beginPath();ctx.arc(80,60,30,0,Math.PI*2);ctx.fill();
      return {photo,jpeg,transparent:canvas.toDataURL('image/png')};
    }""")
    import base64
    for name, data in images.items():
        suffix = "jpg" if name == "jpeg" else "png"
        (OUT / f"{name}.{suffix}").write_bytes(base64.b64decode(data.split(",")[1]))
    jpeg = (OUT / "jpeg.jpg").read_bytes()
    # EXIF orientation=6: a landscape capture should decode as portrait.
    tiff = b"II" + struct.pack("<HIH", 42, 8, 1) + struct.pack("<HHIHHI", 0x112, 3, 1, 6, 0, 0)
    exif = b"Exif\0\0" + tiff
    (OUT / "rotated.jpg").write_bytes(jpeg[:2] + b"\xff\xe1" + struct.pack(">H", len(exif) + 2) + exif + jpeg[2:])
    (OUT / "invalid.jpg").write_bytes(b"not an image")


def run_reduction(page, fixture, output_type="image/jpeg", target="100", width="1600"):
    page.locator("#photoInput").set_input_files(OUT / fixture)
    expect(page.locator("#photoRun")).to_be_enabled(timeout=15000)
    page.locator("#photoFormat").select_option(output_type)
    page.locator("#photoTarget").fill(target)
    page.locator("#photoWidth").fill(width)
    page.locator("#photoRun").click()
    expect(page.locator("#photoResult")).to_be_visible(timeout=30000)
    page.wait_for_function("document.getElementById('photoResultImage').complete && document.getElementById('photoResultImage').naturalWidth > 0")
    return page.evaluate("""() => {
      const image=document.getElementById('photoResultImage'),canvas=document.createElement('canvas');
      canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
      const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
      return {width:image.naturalWidth,height:image.naturalHeight,corner:Array.from(ctx.getImageData(0,0,1,1).data),meta:document.getElementById('photoResultMeta').textContent};
    }""")


def download(page, name):
    with page.expect_download() as event:
        page.locator("#photoDownload").click()
    filename = event.value.suggested_filename
    path = OUT / name
    event.value.save_as(path)
    return path, filename


def main():
    checks, errors, metrics = [], [], {}
    with sync_playwright() as pw, server(True) as local, server(False) as static:
        browser = pw.chromium.launch(channel="chrome", headless=True)
        context = browser.new_context(viewport={"width":1440,"height":1000}, accept_downloads=True)
        page = context.new_page()
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(local + "/?tool=photo")
        expect(page.locator("#photoTool")).to_be_visible()
        make_fixtures(page)
        posts = []
        page.on("request", lambda request: posts.append(request.url) if request.method == "POST" else None)
        for mode, base in (("local", local), ("static", static)):
            page.goto(base + "/?tool=photo")
            expect(page.locator("#photoTool")).to_be_visible()
            size = run_reduction(page, "photo.png")
            result, filename = download(page, mode + "-reduced.jpg")
            assert result.read_bytes().startswith(b"\xff\xd8") and filename.endswith(".jpg")
            assert result.stat().st_size <= 100 * 1024
            assert size["width"] <= 1600 and abs(size["width"] / size["height"] - 1.5) < .015
            with pymupdf.open(result) as decoded:
                assert len(decoded) == 1
            metrics[mode] = {"original_bytes": (OUT/"photo.png").stat().st_size,"result_bytes":result.stat().st_size,"dimensions":[size["width"],size["height"]]}
            checks.append(mode + ": JPG reaches 100 KB target, preserves proportions, and downloads a valid image")
            if mode == "local":
                page.evaluate("document.activeElement?.blur();document.documentElement.style.scrollBehavior='auto';scrollTo({top:0,behavior:'instant'})")
                page.screenshot(path=str(OUT/"desktop.png"),full_page=True)
        assert not posts, posts
        checks.append("No photo uploads in either hosting mode")

        for image_type in ("image/png", "image/webp"):
            size = run_reduction(page, "transparent.png", image_type, target="")
            assert size["corner"][3] == 0 and (size["width"],size["height"]) == (160,120)
            suffix = image_type.split("/")[1]
            result, filename = download(page, "transparent-output."+suffix)
            assert filename.endswith("."+suffix)
            assert result.read_bytes().startswith(b"\x89PNG" if suffix == "png" else b"RIFF")
        checks.append("PNG and WebP preserve transparency and use correct download extensions")
        size = run_reduction(page, "transparent.png", target="")
        assert size["corner"] == [255,255,255,255]
        checks.append("JPG composites transparent areas onto white")
        run_reduction(page,"photo.png","image/png",target="100")
        result, filename = download(page,"resized.png")
        assert result.stat().st_size <= 100 * 1024 and filename.endswith(".png")
        expect(page.locator("#photoQuality")).to_be_disabled()
        checks.append("PNG meets a target by resizing and disables the quality control")
        size = run_reduction(page,"rotated.jpg",target="",width="1000")
        assert size["height"] > size["width"]
        checks.append("Phone-style EXIF rotation is respected")
        page.locator("#photoWidth").fill("900")
        expect(page.locator("#photoResult")).to_be_hidden()
        expect(page.locator("#photoResultImage")).to_be_hidden()
        page.locator("#photoWidth").fill("0")
        page.locator("#photoRun").click()
        expect(page.locator("#photoStatus")).to_contain_text("100 to 4096")
        page.locator("#photoWidth").fill("900")
        page.locator("#photoTarget").fill("1")
        page.locator("#photoRun").click()
        expect(page.locator("#photoStatus")).to_contain_text("10 to 30000")
        checks.append("Changing settings clears stale results; invalid width and target are rejected")
        page.locator("#photoInput").set_input_files(OUT/"invalid.jpg")
        expect(page.locator("#photoRun")).to_be_disabled()
        expect(page.locator("#photoOriginal")).to_be_hidden()
        page.locator("#photoInput").set_input_files({"name":"notes.txt","mimeType":"text/plain","buffer":b"text"})
        expect(page.locator("#photoStatus")).to_contain_text("JPG, PNG, or WebP")
        page.locator("#photoInput").set_input_files({"name":"large.jpg","mimeType":"image/jpeg","buffer":b"x"*(30*1024*1024+1)})
        expect(page.locator("#photoStatus")).to_contain_text("30 MB")
        checks.append("Corrupt files, unsupported types, and oversized inputs are rejected")
        page.locator("#photoInput").set_input_files(OUT/"photo.png")
        expect(page.locator("#photoRun")).to_be_enabled()
        page.locator("#photoFormat").select_option("image/jpeg")
        page.locator("#photoTarget").fill("10")
        page.locator("#photoRun").click()
        page.locator("#photoCancel").click()
        expect(page.locator("#photoStatus")).to_contain_text("cancelled")
        expect(page.locator("#photoRun")).to_be_enabled()
        page.locator("#photoClear").click()
        expect(page.locator("#photoFile")).to_have_text("No photo selected")
        checks.append("Cancellation and clearing release the active workspace")
        page.locator('[data-tool="home"]').click()
        page.locator('.tool-card[data-launch-tool="photo"]').click()
        expect(page.locator("#photoTool")).to_be_visible()
        for width in (320,375,768,1024,1110,1200,1440):
            page.set_viewport_size({"width":width,"height":900})
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), width
        page.set_viewport_size({"width":375,"height":900})
        page.evaluate("document.activeElement?.blur();scrollTo({top:0,behavior:'instant'})")
        page.screenshot(path=str(OUT/"mobile.png"),full_page=True)
        checks.append("Home card/navigation and mobile, tablet, desktop layouts work")
        for tool in ("pdf","reducer","converter","background"):
            page.locator(f'[data-tool="{tool}"]').click()
            expect(page.locator("#"+{"pdf":"pdfTool","reducer":"reducerTool","converter":"converterTool","background":"backgroundTool"}[tool])).to_be_visible()
        checks.append("Existing toolbox navigation works")
        assert not errors, errors
        browser.close()
    report = {"checks":checks,"metrics":metrics,"javascript_errors":errors}
    (OUT/"report.json").write_text(json.dumps(report,indent=2),encoding="utf-8")
    print(json.dumps(report,indent=2))


if __name__ == "__main__":
    main()
