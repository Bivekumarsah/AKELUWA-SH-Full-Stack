import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read=file=>readFile(new URL('../'+file,import.meta.url),'utf8');
const catalog=JSON.parse(await read('toolbox/extra-tools/catalog.json'));
test('Ten added tools do not replace the Company Digital Stamp Maker',async()=>{
 assert.equal(catalog.length,10);
 assert.equal(new Set(catalog.map(x=>x.slug)).size,10);
 const html=await read('toolbox/index.html');
 assert.ok(html.includes('id="stampTool"'));
 assert.ok(html.includes('href="/digital-stamp-maker/"'));
 assert.ok((await read('toolbox/assets/js/stamp-studio.js')).includes('stamp'));
 for(const item of catalog){
  const page=await read('toolbox/extra-tools/'+item.slug+'/index.html');
  assert.ok(html.includes('href="/extra-tools/'+item.slug+'/"'));
  assert.ok(page.includes('data-extra-tool="'+item.slug+'"'));
  assert.ok(page.includes('src="../app.js" defer'));
 }
});
test('Company routing, sitemap, build use isolated extras paths',async()=>{
 const [routing,sitemap,build]=await Promise.all(['next.config.ts','app/sitemap.ts','toolbox/scripts/build-static.mjs'].map(read));
 assert.ok(routing.includes('extraTools.map'));
 assert.ok(routing.includes('destination: toolboxBase + path + "index.html"'));
 assert.ok(sitemap.includes('extraTools.map'));
 assert.ok(build.includes("await cp(join(source, 'extra-tools')"));
 assert.ok(build.includes('extraPaths'));
 assert.ok(build.includes('__TOOLBOX_PUBLIC_ROOT__'));
});
test('Company build publishes canonical links for every new utility',async()=>{
 const sitemap=await read('public/akeluwatoolbox/sitemap.xml');
 for(const item of catalog){
  const page=await read('public/akeluwatoolbox/extra-tools/'+item.slug+'/index.html');
  const canonical='https://www.akeluwasoftwarehub.com.np/akeluwatoolbox/extra-tools/'+item.slug+'/';
  assert.ok(page.includes('href="'+canonical+'"'));
  assert.ok(sitemap.includes(canonical));
 }
});

test('ZIP writer produces standards-compliant local and central headers for DOCX/images',async()=>{
 const { runInNewContext }=await import('node:vm');
 const code=(await read('toolbox/extra-tools/app.js')).replace('  const tasks={"photo-signature-resizer"', '  window.__zipForTest=zipFiles;\n  const tasks={"photo-signature-resizer"');
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
