import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const catalog=JSON.parse(await readFile(join(root,'website/extra-tools/catalog.json'),'utf8'));
const read=p=>readFile(join(root,p),'utf8');
const expected=['photo-signature-resizer','pdf-to-word','pdf-esign-watermark','ocr-text-extractor','unicode-preeti','resume-builder','image-format-converter','qr-code-generator','pdf-page-numbers','bulk-image-compressor'];
test('Ten unique functional standalone tool pages and SEO metadata',async()=>{
 assert.deepEqual(catalog.map(x=>x.slug),expected);
 const home=await read('website/index.html');
 for(const item of catalog){
  assert.ok(item.name && item.description.length>60);
  const html=await read('website/extra-tools/'+item.slug+'/index.html');
  assert.ok(html.includes('data-extra-tool="'+item.slug+'"'));
  assert.ok(html.includes('<form')||item.slug==='resume-builder');
  assert.ok(html.includes('<meta name="description"'));
  assert.ok(html.includes('__TOOLBOX_PUBLIC_ROOT__/extra-tools/'+item.slug+'/'));
  assert.ok(html.includes('src="../app.js" defer'));
  assert.ok(home.includes('href="/extra-tools/'+item.slug+'/"'));
 }
 assert.ok(home.includes('href="/extra-tools/"'));
});
test('Browser script covers all tools, uses local image/PDF processing and safe output',async()=>{
 const s=await read('website/extra-tools/app.js');
 for(const item of catalog)assert.ok(s.includes('"'+item.slug+'":'));
 for(const required of ['getTextContent','PDFDocument.load','toBlob','Tesseract','qrcode.min.js','window.print','new Blob([body,directory,end]','openImage(file)','file.arrayBuffer()']) assert.ok(s.includes(required),required);
 assert.ok(!s.includes('fetch('));
 assert.ok(!s.includes('XMLHttpRequest'));
 assert.ok(!s.includes('eval('));
});
test('Static build creates 21 SEO URLs with correct canonical and asset paths',async()=>{
 execFileSync('node',['scripts/build-static.mjs'],{cwd:root,env:{...process.env,SITE_URL:'https://demo.example.org',SITE_BASE_PATH:''},stdio:'pipe'});
 const sitemap=await read('dist/sitemap.xml');
 for(const {slug} of catalog){
  const path='extra-tools/'+slug+'/index.html';
  const page=await read('dist/'+path);
  assert.ok(page.includes('href="https://demo.example.org/extra-tools/'+slug+'/'));
  assert.ok(!page.includes('__TOOLBOX_PUBLIC_ROOT__'));
  assert.ok(page.includes('href="../../assets/images/favicon.png"'));
  assert.ok(sitemap.includes('https://demo.example.org/extra-tools/'+slug+'/'));
 }
 assert.equal((sitemap.match(/<loc>/g)||[]).length,21);
 assert.ok((await stat(join(root,'dist/extra-tools/app.js'))).isFile());
});
test('Nested company base path changes new canonical links safely',async()=>{
 execFileSync('node',['scripts/build-static.mjs'],{cwd:root,env:{...process.env,SITE_URL:'https://company.example.org',SITE_BASE_PATH:'/akeluwatoolbox'},stdio:'pipe'});
 const page=await read('dist/extra-tools/pdf-to-word/index.html');
 const sitemap=await read('dist/sitemap.xml');
 assert.ok(page.includes('href="https://company.example.org/akeluwatoolbox/extra-tools/pdf-to-word/"'));
 assert.ok(sitemap.includes('https://company.example.org/akeluwatoolbox/extra-tools/pdf-to-word/'));
 assert.ok(page.includes('src="../../assets/vendor/pdfjs/pdf.min.js"'));
});

test('ZIP writer produces standards-compliant local and central headers for DOCX/images',async()=>{
 const { runInNewContext }=await import('node:vm');
 const code=(await read('website/extra-tools/app.js')).replace('  const tasks={"photo-signature-resizer"', '  window.__zipForTest=zipFiles;\n  const tasks={"photo-signature-resizer"');
 assert.ok(code.includes('window.__zipForTest=zipFiles'));
 const sandbox={document:{body:{dataset:{extraTool:'unit-test'}},getElementById(){return null;}},window:{},TextEncoder,Blob,Uint8Array,URL,console};
 runInNewContext(code,sandbox,{timeout:1000});
 const payload='Hello ZIP',filename='test.txt';
 const archive=await sandbox.window.__zipForTest([{name:filename,data:payload}]);
 const bytes=new Uint8Array(await archive.arrayBuffer());
 const dv=new DataView(bytes.buffer);
 const u16=(offset)=>dv.getUint16(offset,true),u32=(offset)=>dv.getUint32(offset,true);
 assert.equal(u32(0),0x04034b50);
 assert.equal(u16(8),0,'local compression method: store');
 assert.equal(u32(18),payload.length);
 assert.equal(u16(26),filename.length);
 assert.equal(u16(28),0);
 const central=30+filename.length+payload.length;
 assert.equal(u32(central),0x02014b50);
 assert.equal(u16(central+10),0,'central compression method: store');
 assert.equal(u16(central+28),filename.length);
 const end=central+46+filename.length;
 assert.equal(u32(end),0x06054b50);
 assert.equal(u32(end+16),central,'central directory starts at correct offset');
});

test('Resume print CSS keeps preview visible and PNG reports accurate target sizes',async()=>{
 const [css,js]=await Promise.all(['website/extra-tools/style.css','website/extra-tools/app.js'].map(read));
 assert.ok(css.includes('body[data-extra-tool="resume-builder"] .extra-panel > .extra-fields{display:block!important}'));
 assert.ok(css.includes('#cvForm{display:none!important}'));
 assert.ok(js.includes('blob.size<=targetKB*1024'));
 assert.ok(js.includes('drawImageTo(img,img.naturalWidth,img.naturalHeight'));
});

test('Tool finder resolves categories, synonyms and multiword searches without a server',async()=>{
 const {categoryForPath,matchesTool,normalizeSearch}=await import('../website/assets/js/tool-finder.mjs');
 assert.equal(categoryForPath('/akeluwatoolbox/extra-tools/pdf-to-word/'),'documents');
 assert.equal(categoryForPath('/akeluwatoolbox/digital-stamp-maker/'),'business');
 assert.equal(categoryForPath('/extra-tools/unicode-preeti/'),'everyday');
 assert.equal(categoryForPath('/compress-photo/'),'images');
 assert.equal(normalizeSearch('  RESIZE  PDF! '),'resize pdf');
 const photo={title:'Photo size reducer',description:'Convert and compress a passport image under 200 KB',href:'/compress-photo/'};
 assert.equal(matchesTool(photo,'shrink photo','images'),true);
 assert.equal(matchesTool(photo,'compress photo','documents'),false);
 assert.equal(matchesTool(photo,'unrelated word','all'),false);
 const stamp={title:'Digital stamp maker',description:'Create an authorized business seal',href:'/akeluwatoolbox/digital-stamp-maker/'};
 assert.equal(matchesTool(stamp,'business stamp','business'),true);
});
test('All tool catalogs have an accessible, functional search hook and stamp is not lost',async()=>{
 const [home,extra,script,css]=await Promise.all([
  read('website/index.html'),read('website/extra-tools/index.html'),
  read('website/assets/js/tool-finder.mjs'),read('website/assets/css/design.css')]);
 for(const html of [home,extra]){
  assert.ok(html.includes('id="toolSearch"'));
  assert.ok(html.includes('id="toolSearchCount"'));
  assert.ok(html.includes('aria-live="polite"'));
  assert.ok(html.includes('tool-finder.mjs'));
 }
 assert.ok(home.includes('https://www.akeluwasoftwarehub.com.np/akeluwatoolbox/digital-stamp-maker/'));
 assert.ok(script.includes("event.key !== 'Enter'"));
 assert.ok(script.includes('button.setAttribute(\'aria-pressed\''));
 assert.ok(css.includes('.tool-card[hidden]'));
});

test('Safe synchronization never overwrites advanced company stamp source or routes',async()=>{
 const sync=await read('scripts/sync-company-toolbox.mjs');
 for(const protectedPath of ['index.html','routes.json','assets/js/digital-stamp.js','assets/js/stamp-studio.js','assets/js/country-stamps.js','assets/js/seo.js']){
  assert.ok(!sync.includes("'"+protectedPath+"',"), 'protected target in shared copy list: '+protectedPath);
 }
 assert.ok(sync.includes("home.includes('id=\"stampTool\"')"));
 assert.ok(sync.includes("verify !== home"));
 assert.ok(sync.includes("includes('--dry-run')"));
});

test('Live mobile previews cover all 10 extra tool pages and core photo/PDF utilities',async()=>{
 const catalog=JSON.parse(await read('website/extra-tools/catalog.json'));
 for(const item of catalog){
   const html=await read('website/extra-tools/'+item.slug+'/index.html');
   assert.ok(html.includes('extra-live-previews.mjs'),item.slug);
 }
 const mod=await read('website/assets/js/extra-live-previews.mjs');
 const app=await read('website/extra-tools/app.js');
 const home=await read('website/index.html');
 const core=await read('website/assets/js/core-live-previews.mjs');
 assert.ok(mod.includes('requestAnimationFrame(render)'));
 assert.ok(mod.includes('URL.revokeObjectURL'));
 assert.ok(app.includes('byId("fontInput").addEventListener("input",updateText)'));
 assert.ok(app.includes('byId("qrValue").addEventListener("input",schedule)'));
 assert.ok(home.includes('core-live-previews.mjs'));
 assert.ok(core.includes('First-page preview is below'));
});
