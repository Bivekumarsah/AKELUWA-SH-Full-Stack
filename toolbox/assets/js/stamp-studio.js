const DEFAULT_INK='#0b4ea2';
const FONTS=['Arial','Georgia','Verdana','Trebuchet MS','Times New Roman'];
const INKS=['#0b4ea2','#111111','#a42424','#8a2be2','#146c43','#b45309','#be123c','#0f766e'];
const SIZE_PRESETS=[
  ['Round 38 mm',38,38],['Round 42 mm',42,42],['Round 50 mm',50,50],
  ['Rectangle 47 × 18 mm',47,18],['Rectangle 58 × 22 mm',58,22],['Square 40 mm',40,40]
];

const clamp=(v,min,max)=>Math.min(max,Math.max(min,Number(v)||0));
const esc=(v='')=>String(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const clean=(v='',max=180)=>String(v).trim().replace(/\s+/g,' ').slice(0,max);
const color=v=>/^#[0-9a-f]{6}$/i.test(v)?v:DEFAULT_INK;
const font=v=>FONTS.includes(v)?v:'Arial';
const uid=()=>Math.floor(Date.now()+Math.random()*1000000);
const blobDownload=(blob,name)=>{
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),500);
};
const readImage=file=>new Promise((resolve,reject)=>{
  if(!file)return reject(new Error('Choose an image.'));
  if(file.size>5*1024*1024)return reject(new Error('Image must be smaller than 5 MB.'));
  if(!['image/png','image/jpeg','image/webp','image/svg+xml'].includes(file.type))return reject(new Error('Use PNG, JPG, WebP, or SVG.'));
  const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Could not read image.'));reader.readAsDataURL(file);
});
const svgData=svg=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);

const SYMBOLS=[
  ['Business','Star',svgData('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50 8l12 27 30 3-23 20 7 29-26-15-26 15 7-29L8 38l30-3z" fill="#0b4ea2"/></svg>')],
  ['Business','Check',svgData('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M18 53l19 19 45-48" fill="none" stroke="#0b4ea2" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/></svg>')],
  ['Office','Box',svgData('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="18" y="24" width="64" height="52" rx="6" fill="none" stroke="#0b4ea2" stroke-width="8"/><path d="M18 40h64" stroke="#0b4ea2" stroke-width="8"/></svg>')],
  ['Office','Document',svgData('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M27 12h32l16 16v60H27z" fill="none" stroke="#0b4ea2" stroke-width="7"/><path d="M59 12v18h16M38 48h26M38 62h26" fill="none" stroke="#0b4ea2" stroke-width="6"/></svg>')],
  ['Education','Book',svgData('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M12 24c18-6 30-2 38 7v52c-8-9-20-13-38-7zm76 0c-18-6-30-2-38 7v52c8-9 20-13 38-7z" fill="none" stroke="#0b4ea2" stroke-width="7"/></svg>')],
  ['General','Leaf',svgData('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M82 16C43 18 19 39 20 69c26 8 53-7 62-53zM22 75c17-18 31-31 52-47" fill="none" stroke="#0b4ea2" stroke-width="7" stroke-linecap="round"/></svg>')]
];

function baseItem(type,ink=DEFAULT_INK){
  const id=uid();
  if(type==='ring')return{id,type,x:250,y:250,radius:185,thickness:5,ink,dash:'solid',visible:true};
  if(type==='ellipse')return{id,type,x:250,y:250,rx:190,ry:125,thickness:5,ink,dash:'solid',visible:true};
  if(type==='rect')return{id,type,x:250,y:250,w:390,h:180,rx:12,thickness:5,ink,dash:'solid',visible:true};
  if(type==='frame')return{id,type,x:250,y:250,w:410,h:210,rx:16,thickness:4,ink,dash:'solid',frameStyle:'double',visible:true};
  if(type==='triangle')return{id,type,x:250,y:255,w:390,h:330,thickness:5,ink,dash:'solid',visible:true};
  if(type==='line')return{id,type,x:150,y:250,x2:350,y2:250,thickness:4,ink,dash:'solid',visible:true};
  if(type==='arcText')return{id,type,text:'CURVED TEXT',x:250,y:250,radius:165,start:-150,sweep:120,direction:'forward',size:26,spacing:1,ink,font:'Arial',weight:700,visible:true};
  if(type==='image')return{id,type,x:250,y:250,w:105,h:105,src:'',visible:true};
  return{id,type:'text',text:'YOUR TEXT',x:250,y:250,size:28,rotation:0,spacing:1,ink,font:'Arial',weight:700,align:'middle',invert:false,visible:true};
}

function withIds(items){return items.map(item=>({...item,id:uid()}))}
function presets(){
  return [
    {name:'Round Business',kind:'round',w:42,h:42,items:withIds([
      {...baseItem('ring'),radius:205,thickness:6},{...baseItem('ring'),radius:158,thickness:3},
      {...baseItem('arcText'),text:'SAMPLE BUSINESS PVT. LTD.',radius:181,start:-145,sweep:110,size:24},
      {...baseItem('arcText'),text:'KATHMANDU · NEPAL',radius:181,start:35,sweep:110,size:20,direction:'reverse'},
      {...baseItem('text'),text:'AUTHORIZED',y:255,size:28}
    ])},
    {name:'Double Ring Company',kind:'round',w:45,h:45,items:withIds([
      {...baseItem('ring'),radius:210,thickness:7},{...baseItem('ring'),radius:165,thickness:4},
      {...baseItem('arcText'),text:'YOUR COMPANY NAME',radius:188,start:-150,sweep:120,size:28},
      {...baseItem('arcText'),text:'CITY · COUNTRY',radius:188,start:30,sweep:120,size:21,direction:'reverse'},
      {...baseItem('text'),text:'EST. 2026',y:255,size:25}
    ])},
    {name:'Oval Business',kind:'oval',w:55,h:32,items:withIds([
      {...baseItem('ellipse'),rx:210,ry:135,thickness:6},{...baseItem('ellipse'),rx:178,ry:105,thickness:3},
      {...baseItem('text'),text:'SAMPLE TRADING HOUSE',y:215,size:26},{...baseItem('text'),text:'KATHMANDU, NEPAL',y:270,size:20}
    ])},
    {name:'Rectangle Office',kind:'rectangle',w:58,h:22,items:withIds([
      {...baseItem('rect'),w:430,h:210,thickness:6},{...baseItem('text'),text:'SAMPLE ENTERPRISE',y:210,size:28},
      {...baseItem('text'),text:'KATHMANDU, NEPAL',y:258,size:20},{...baseItem('text'),text:'CONTACT OFFICE',y:305,size:23}
    ])},
    {name:'Square Business',kind:'square',w:40,h:40,items:withIds([
      {...baseItem('rect'),w:390,h:390,rx:16,thickness:6},{...baseItem('rect'),w:340,h:340,rx:10,thickness:3},
      {...baseItem('text'),text:'SAMPLE BUSINESS',y:205,size:28},{...baseItem('text'),text:'KATHMANDU',y:260,size:22}
    ])},
    {name:'Triangle Business',kind:'triangle',w:45,h:40,items:withIds([
      {...baseItem('triangle'),w:410,h:350,thickness:6},{...baseItem('text'),text:'SAMPLE',y:230,size:29},
      {...baseItem('text'),text:'BUSINESS',y:275,size:25}
    ])},
    {name:'Received',kind:'office',w:47,h:18,items:withIds([
      {...baseItem('rect'),w:430,h:210,thickness:6,ink:'#a42424'},{...baseItem('text'),text:'RECEIVED',y:220,size:48,ink:'#a42424'},
      {...baseItem('text'),text:'DATE: __________',y:290,size:23,ink:'#a42424'}
    ])},
    {name:'Paid',kind:'office',w:42,h:18,items:withIds([
      {...baseItem('rect'),w:410,h:210,thickness:6,ink:'#146c43'},{...baseItem('text'),text:'PAID',y:235,size:56,ink:'#146c43'},
      {...baseItem('text'),text:'DATE: __________',y:300,size:22,ink:'#146c43'}
    ])},
    {name:'Authorized',kind:'office',w:50,h:20,items:withIds([
      {...baseItem('rect'),w:430,h:220,thickness:6},{...baseItem('text'),text:'AUTHORIZED',y:230,size:42},
      {...baseItem('text'),text:'SIGN: __________',y:300,size:21}
    ])},
    {name:'Date & Records',kind:'office',w:52,h:22,items:withIds([
      {...baseItem('rect'),w:430,h:240,thickness:5},{...baseItem('text'),text:'DATE',y:205,size:35},
      {...baseItem('text'),text:'____ / ____ / ______',y:265,size:24},{...baseItem('line'),x:135,y:305,x2:365,y2:305,thickness:2}
    ])},
    {name:'Nepali Business',kind:'round',w:42,h:42,items:withIds([
      {...baseItem('ring'),radius:205,thickness:6},{...baseItem('ring'),radius:160,thickness:3},
      {...baseItem('arcText'),text:'नमुना व्यवसाय',radius:183,start:-135,sweep:90,size:31},
      {...baseItem('arcText'),text:'काठमाडौं · नेपाल',radius:183,start:45,sweep:90,size:24,direction:'reverse'}
    ])},
    {name:'Library',kind:'office',w:48,h:22,items:withIds([
      {...baseItem('rect'),w:430,h:235,thickness:5},{...baseItem('text'),text:'LIBRARY',y:205,size:37},
      {...baseItem('text'),text:'RETURN DATE',y:260,size:22},{...baseItem('text'),text:'____ / ____ / ______',y:305,size:20}
    ])}
  ];
}

function dashValue(v){return v==='dashed'?'16 10':v==='dotted'?'3 10':v==='broken'?'28 18':''}
function polar(cx,cy,r,deg){const a=(deg-90)*Math.PI/180;return{x:cx+r*Math.cos(a),y:cy+r*Math.sin(a)}}
function arcPath(item,id){
  const sweep=Math.max(1,Math.min(359.5,Number(item.sweep)||120));
  const start=Number(item.start)||0,end=start+(item.direction==='reverse'?-sweep:sweep);
  const p1=polar(item.x,item.y,item.radius,start),p2=polar(item.x,item.y,item.radius,end);
  const large=sweep>180?1:0,flag=item.direction==='reverse'?0:1;
  return '<path id="'+id+'" d="M '+p1.x+' '+p1.y+' A '+item.radius+' '+item.radius+' 0 '+large+' '+flag+' '+p2.x+' '+p2.y+'" fill="none"/>';
}
function frameMarkup(e){
  const x=e.x-e.w/2,y=e.y-e.h/2,d=dashValue(e.dash);
  const first='<rect data-element="'+e.id+'" x="'+x+'" y="'+y+'" width="'+e.w+'" height="'+e.h+'" rx="'+(e.rx||0)+'" fill="none" stroke="'+color(e.ink)+'" stroke-width="'+e.thickness+'"'+(d?' stroke-dasharray="'+d+'"':'')+'/>';
  if(e.frameStyle!=='double')return first;
  return first+'<rect x="'+(x+18)+'" y="'+(y+18)+'" width="'+Math.max(10,e.w-36)+'" height="'+Math.max(10,e.h-36)+'" rx="'+Math.max(0,(e.rx||0)-4)+'" fill="none" stroke="'+color(e.ink)+'" stroke-width="'+Math.max(1,e.thickness-1)+'"/>';
}
function itemMarkup(e,defs){
  if(!e.visible)return '';
  const ink=color(e.ink),d=dashValue(e.dash);
  if(e.type==='ring')return '<circle data-element="'+e.id+'" cx="'+e.x+'" cy="'+e.y+'" r="'+e.radius+'" fill="none" stroke="'+ink+'" stroke-width="'+e.thickness+'"'+(d?' stroke-dasharray="'+d+'"':'')+'/>';
  if(e.type==='ellipse')return '<ellipse data-element="'+e.id+'" cx="'+e.x+'" cy="'+e.y+'" rx="'+e.rx+'" ry="'+e.ry+'" fill="none" stroke="'+ink+'" stroke-width="'+e.thickness+'"'+(d?' stroke-dasharray="'+d+'"':'')+'/>';
  if(e.type==='rect')return '<rect data-element="'+e.id+'" x="'+(e.x-e.w/2)+'" y="'+(e.y-e.h/2)+'" width="'+e.w+'" height="'+e.h+'" rx="'+(e.rx||0)+'" fill="none" stroke="'+ink+'" stroke-width="'+e.thickness+'"'+(d?' stroke-dasharray="'+d+'"':'')+'/>';
  if(e.type==='frame')return frameMarkup(e);
  if(e.type==='triangle'){const x=e.x,y=e.y,w=e.w,h=e.h;return '<polygon data-element="'+e.id+'" points="'+x+','+(y-h/2)+' '+(x-w/2)+','+(y+h/2)+' '+(x+w/2)+','+(y+h/2)+'" fill="none" stroke="'+ink+'" stroke-width="'+e.thickness+'"'+(d?' stroke-dasharray="'+d+'"':'')+'/>'}
  if(e.type==='line')return '<line data-element="'+e.id+'" x1="'+e.x+'" y1="'+e.y+'" x2="'+e.x2+'" y2="'+e.y2+'" stroke="'+ink+'" stroke-width="'+e.thickness+'" stroke-linecap="round"'+(d?' stroke-dasharray="'+d+'"':'')+'/>';
  if(e.type==='image')return e.src?'<image data-element="'+e.id+'" href="'+esc(e.src)+'" x="'+(e.x-e.w/2)+'" y="'+(e.y-e.h/2)+'" width="'+e.w+'" height="'+e.h+'" preserveAspectRatio="xMidYMid meet"/>':'';
  if(e.type==='arcText'){
    const pid='arc-'+e.id;defs.push(arcPath(e,pid));
    return '<text data-element="'+e.id+'" fill="'+ink+'" font-family="'+esc(font(e.font))+'" font-size="'+e.size+'" font-weight="'+(e.weight||700)+'" letter-spacing="'+(e.spacing||0)+'" text-anchor="middle"><textPath href="#'+pid+'" startOffset="50%">'+esc(clean(e.text))+'</textPath></text>';
  }
  const anchor=e.align==='start'?'start':e.align==='end'?'end':'middle';
  const t='<text data-element="'+e.id+'" x="'+e.x+'" y="'+e.y+'" text-anchor="'+anchor+'" dominant-baseline="middle" fill="'+(e.invert?'#ffffff':ink)+'" font-family="'+esc(font(e.font))+'" font-size="'+e.size+'" font-weight="'+(e.weight||700)+'" letter-spacing="'+(e.spacing||0)+'" transform="rotate('+(e.rotation||0)+' '+e.x+' '+e.y+')">'+esc(clean(e.text))+'</text>';
  if(!e.invert)return t;
  const width=Math.max(70,clean(e.text).length*e.size*.68+28),height=e.size*1.55;
  return '<g transform="rotate('+(e.rotation||0)+' '+e.x+' '+e.y+')"><rect x="'+(e.x-width/2)+'" y="'+(e.y-height/2)+'" width="'+width+'" height="'+height+'" rx="8" fill="'+ink+'"/></g>'+t;
}
function studioSvg(state,forExport=false){
  const defs=[],body=state.items.map(e=>itemMarkup(e,defs)).join('');
  const sat=clamp(state.saturation,0,200)/100,bright=clamp(state.brightness,30,170)/100;
  const fx='<filter id="studioFx" x="-20%" y="-20%" width="140%" height="140%"><feColorMatrix type="saturate" values="'+sat+'"/><feComponentTransfer><feFuncR type="linear" slope="'+bright+'"/><feFuncG type="linear" slope="'+bright+'"/><feFuncB type="linear" slope="'+bright+'"/></feComponentTransfer></filter>';
  const texture=state.texture?'<filter id="wear"><feTurbulence baseFrequency=".65" numOctaves="2" seed="4" type="fractalNoise" result="noise"/><feColorMatrix in="noise" type="luminanceToAlpha" result="alpha"/><feComponentTransfer in="alpha" result="fade"><feFuncA type="table" tableValues="1 .72 1 .8"/></feComponentTransfer><feComposite in="SourceGraphic" in2="fade" operator="in"/></filter>':'';
  const background=state.transparent?'':'<rect width="500" height="500" fill="#ffffff"/>';
  const filters=' filter="url(#studioFx)"'+(state.texture?' style="filter:url(#wear)"':'');
  return '<svg xmlns="http://www.w3.org/2000/svg" width="'+state.widthMm+'mm" height="'+state.heightMm+'mm" viewBox="0 0 500 500" preserveAspectRatio="none" role="img" aria-label="Stamp design">'+
    '<defs>'+defs.join('')+fx+texture+'</defs>'+background+'<g'+filters+'>'+body+'</g></svg>';
}

function inputRow(label,input,help=''){
  const wrap=document.createElement('label');wrap.style.cssText='display:grid;gap:5px;font-size:13px';
  const title=document.createElement('span');title.textContent=label;title.style.fontWeight='600';wrap.append(title,input);
  if(help){const small=document.createElement('small');small.textContent=help;small.style.color='#6b7280';wrap.append(small)}
  return wrap;
}
function numberInput(value,min,max,step=1){const i=document.createElement('input');i.type='number';i.value=value;i.min=min;i.max=max;i.step=step;return i}
function selectInput(value,options){const s=document.createElement('select');options.forEach(opt=>{const o=document.createElement('option');o.value=Array.isArray(opt)?opt[0]:opt;o.textContent=Array.isArray(opt)?opt[1]:opt;s.append(o)});s.value=value;return s}
function textInput(value){const i=document.createElement('input');i.type='text';i.value=value||'';return i}
function checkInput(value){const i=document.createElement('input');i.type='checkbox';i.checked=!!value;return i}
function colorInput(value){const i=document.createElement('input');i.type='color';i.value=color(value);return i}

async function canvasFromSvg(svgText,width=1400,height=1400){
  const blob=new Blob([svgText],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob),img=new Image();
  try{
    await new Promise((res,rej)=>{img.onload=res;img.onerror=rej;img.src=url});
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d');ctx.clearRect(0,0,width,height);ctx.drawImage(img,0,0,width,height);return canvas;
  }finally{URL.revokeObjectURL(url)}
}
const canvasBlob=(canvas,type='image/png',quality=.96)=>new Promise(resolve=>canvas.toBlob(resolve,type,quality));

function crc32(bytes){
  let crc=-1;
  for(const b of bytes){crc^=b;for(let k=0;k<8;k++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}
  return (crc^-1)>>>0;
}
function u16(v){return new Uint8Array([v&255,(v>>>8)&255])}
function u32(v){return new Uint8Array([v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255])}
function concat(parts){const len=parts.reduce((n,p)=>n+p.length,0),out=new Uint8Array(len);let o=0;for(const p of parts){out.set(p,o);o+=p.length}return out}
function zipStore(files){
  const enc=new TextEncoder(),locals=[],centrals=[];let offset=0;
  for(const file of files){
    const name=enc.encode(file.name),data=file.data instanceof Uint8Array?file.data:enc.encode(file.data),crc=crc32(data);
    const local=concat([u32(0x04034b50),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),name,data]);
    locals.push(local);
    const central=concat([u32(0x02014b50),u16(20),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),name]);
    centrals.push(central);offset+=local.length;
  }
  const central=concat(centrals),local=concat(locals),count=files.length;
  const end=concat([u32(0x06054b50),u16(0),u16(0),u16(count),u16(count),u32(central.length),u32(local.length),u16(0)]);
  return concat([local,central,end]);
}
async function docxBlob(state){
  const canvas=await canvasFromSvg(studioSvg(state,true),1500,Math.max(300,Math.round(1500*state.heightMm/state.widthMm)));
  const png=await canvasBlob(canvas),pngBytes=new Uint8Array(await png.arrayBuffer()),cx=Math.round(state.widthMm*36000),cy=Math.round(state.heightMm*36000);
  const ct='<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>';
  const rels='<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
  const drels='<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/stamp.png"/></Relationships>';
  const doc='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body><w:p><w:r><w:drawing><wp:inline><wp:extent cx="'+cx+'" cy="'+cy+'"/><wp:docPr id="1" name="AKELUWA Stamp"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="stamp.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="'+cx+'" cy="'+cy+'"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p><w:sectPr/></w:body></w:document>';
  const zip=zipStore([{name:'[Content_Types].xml',data:ct},{name:'_rels/.rels',data:rels},{name:'word/document.xml',data:doc},{name:'word/_rels/document.xml.rels',data:drels},{name:'word/media/stamp.png',data:pngBytes}]);
  return new Blob([zip],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}
async function epsBlob(state){
  const w=700,h=Math.max(220,Math.round(700*state.heightMm/state.widthMm)),canvas=await canvasFromSvg(studioSvg({...state,transparent:false},true),w,h),ctx=canvas.getContext('2d'),data=ctx.getImageData(0,0,w,h).data;
  let hex='',line='';
  for(let i=0;i<data.length;i+=4){
    const a=data[i+3]/255,r=Math.round(data[i]*a+255*(1-a)),g=Math.round(data[i+1]*a+255*(1-a)),b=Math.round(data[i+2]*a+255*(1-a));
    line+=r.toString(16).padStart(2,'0')+g.toString(16).padStart(2,'0')+b.toString(16).padStart(2,'0');
    if(line.length>120){hex+=line+'\n';line=''}
  }
  hex+=line;
  const ps='%!PS-Adobe-3.0 EPSF-3.0\n%%BoundingBox: 0 0 '+w+' '+h+'\n/picstr '+(w*3)+' string def\n'+w+' '+h+' 8\n['+w+' 0 0 -'+h+' 0 '+h+']\n{currentfile picstr readhexstring pop} false 3 colorimage\n'+hex+'\nshowpage\n%%EOF';
  return new Blob([ps],{type:'application/postscript'});
}

export function initStampStudio({root,toast=()=>{}}={}){
  if(!root||root.querySelector('[data-ak-studio]'))return;
  let state={items:[],widthMm:42,heightMm:42,transparent:true,texture:false,saturation:100,brightness:100,zoom:1,selected:null,activePreset:'Round Business'};
  let undo=[],redo=[];
  const autosaveKey='akeluwastamp-autosave-v3';
  const copy=()=>JSON.parse(JSON.stringify(state));
  const autoSave=()=>{try{localStorage.setItem(autosaveKey,JSON.stringify({version:3,state}))}catch{}};
  const restore=s=>{state=JSON.parse(JSON.stringify(s));renderAll();autoSave()};
  const remember=()=>{undo.push(copy());if(undo.length>40)undo.shift();redo=[]};
  const applyChange=fn=>{remember();fn();renderAll();autoSave()};
  const studio=document.createElement('section');studio.dataset.akStudio='1';studio.hidden=true;
  studio.style.cssText='margin:18px 0;padding:18px;border:1px solid #dfe3e8;border-radius:14px;background:#fff';
  studio.innerHTML='<style>'+
  '[data-ak-studio]{--ak-line:#e3e7ec;--ak-muted:#66716a;--ak-blue:#1767c0}'+
  '[data-ak-studio] button,[data-ak-studio] select,[data-ak-studio] input{font:inherit}'+
  '[data-ak-studio] button{cursor:pointer}'+
  '[data-ak-studio] input:not([type="checkbox"]):not([type="color"]),[data-ak-studio] select{width:100%;box-sizing:border-box;padding:8px;border:1px solid #cfd6df;border-radius:7px;background:#fff}'+
  '[data-ak-studio] .ak-studio-toolbar{position:sticky;top:84px;z-index:8;display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;padding:10px 0;background:#fff;border-bottom:1px solid var(--ak-line)}'+
  '[data-ak-studio] .ak-studio-toolbar-group{display:flex;gap:6px;flex-wrap:wrap}'+
  '[data-ak-studio] .ak-studio-workspace{display:grid;grid-template-columns:minmax(360px,.85fr) minmax(440px,1.15fr);gap:18px;align-items:start;margin-top:14px}'+
  '[data-ak-studio] .ak-studio-controls{max-height:calc(100vh - 150px);overflow-y:auto;padding-right:8px;scrollbar-gutter:stable}'+
  '[data-ak-studio] .ak-step{border:1px solid var(--ak-line);border-radius:12px;background:#fff;margin-bottom:10px;overflow:hidden}'+
  '[data-ak-studio] .ak-step summary{cursor:pointer;padding:14px 16px;font-weight:800;background:#f8fafc;list-style:none}'+
  '[data-ak-studio] .ak-step summary::-webkit-details-marker{display:none}'+
  '[data-ak-studio] .ak-step-body{padding:0 16px 16px}'+
  '[data-ak-studio] .ak-studio-preview-pane{position:sticky;top:100px;align-self:start;background:#f8fafc;border:1px solid var(--ak-line);border-radius:14px;padding:14px}'+
  '[data-ak-studio] .ak-preview-canvas{margin-top:10px;min-height:520px;display:grid;place-items:center;overflow:auto;background:#fff;border-radius:10px;border:1px dashed #cfd6df;padding:18px}'+
  '[data-ak-studio] .ak-preview-canvas svg{display:block}'+
  '[data-ak-studio] .ak-template-card{display:grid;grid-template-rows:86px auto;gap:7px;padding:9px;border:1px solid #dbe1e8;border-radius:9px;background:#fff;text-align:left}'+
  '[data-ak-studio] .ak-template-thumb{display:grid;place-items:center;background:#f8fafc;border-radius:7px;overflow:hidden}'+
  '[data-ak-studio] .ak-template-thumb svg{max-width:82px;max-height:76px;width:auto;height:auto}'+
  '[data-ak-studio] .ak-sticky-download{position:sticky;bottom:0;z-index:5;padding:9px 0;background:linear-gradient(transparent,#fff 25%)}'+
  '@media(max-width:980px){[data-ak-studio] .ak-studio-toolbar{top:8px}[data-ak-studio] .ak-studio-workspace{grid-template-columns:1fr}[data-ak-studio] .ak-studio-controls{max-height:none;overflow:visible;padding-right:0}[data-ak-studio] .ak-studio-preview-pane{position:relative;top:0;order:-1}[data-ak-studio] .ak-preview-canvas{min-height:320px}}'+
  '</style>'+
  '<div><p style="margin:0;color:#1767c0;font-weight:800;font-size:12px">AKELUWA STAMP STUDIO</p><h2 style="margin:4px 0 6px">Create your stamp with the preview always visible</h2><p style="margin:0;color:#66716a">Edit on the left. Your live stamp stays locked on the right while you scroll.</p></div>'+
  '<div class="ak-studio-toolbar"><div class="ak-studio-toolbar-group"><button type="button" data-undo>↶ Undo</button><button type="button" data-redo>↷ Redo</button><button type="button" data-new-design>New design</button></div><div class="ak-studio-toolbar-group"><button type="button" data-reset-selected>Reset selected</button><button type="button" data-reset-all>Reset whole stamp</button><button type="button" data-go-download>Download ↓</button></div></div>'+
  '<div class="ak-studio-workspace">'+
    '<div class="ak-studio-controls" data-controls>'+
      '<details class="ak-step" data-step="1" open><summary>1. Choose a starting design</summary><div class="ak-step-body"><p style="color:#66716a">Pick the closest sample. Every part can still be changed.</p><div data-presets style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px"></div><div style="margin-top:10px"><button type="button" data-new-blank>Start blank instead</button></div></div></details>'+
      '<details class="ak-step" data-step="2"><summary>2. Enter your details</summary><div class="ak-step-body"><p style="color:#66716a">Change the main words without touching advanced settings.</p><div style="display:grid;gap:10px"><label>Business / organization<input data-quick-name type="text" placeholder="Your business name"></label><label>Address / location<input data-quick-address type="text" placeholder="Kathmandu, Nepal"></label><label>Center text<input data-quick-center type="text" placeholder="AUTHORIZED"></label></div><button type="button" data-quick-apply style="margin-top:10px">Apply these details</button></div></details>'+
      '<details class="ak-step" data-step="3"><summary>3. Text, logo, rings & shapes</summary><div class="ak-step-body"><p style="color:#66716a">Add what you need. Click any item on the preview to adjust it.</p><div data-add-buttons style="display:flex;flex-wrap:wrap;gap:7px"></div><details style="margin-top:12px"><summary style="cursor:pointer;font-weight:700">All design items</summary><div data-items style="display:grid;gap:6px;margin-top:10px"></div></details><div data-properties style="margin-top:12px"></div></div></details>'+
      '<details class="ak-step" data-step="4"><summary>4. Size, colors, effects & download</summary><div class="ak-step-body"><div data-sheet style="display:grid;gap:12px;margin-top:8px"></div><label style="display:flex;gap:8px;align-items:flex-start;margin:12px 0"><input data-authorized type="checkbox"> <span>I am authorized to create and use this business or organization stamp.</span></label><div data-export style="display:flex;flex-wrap:wrap;gap:8px"></div></div></details>'+
      '<div class="ak-sticky-download"><button type="button" data-go-download-bottom style="width:100%;padding:10px;font-weight:800">Download or save stamp ↓</button></div>'+
    '</div>'+
    '<aside class="ak-studio-preview-pane"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><div><strong>Live preview</strong><div style="font-size:12px;color:#66716a">Stays visible while you edit</div></div><div style="display:flex;gap:5px;align-items:center"><button type="button" data-fit>Fit</button><button type="button" data-reset-view>Reset view</button><button type="button" data-zoom-out>−</button><span data-zoom-label style="display:inline-block;min-width:48px;text-align:center">100%</span><button type="button" data-zoom-in>+</button></div></div><div class="ak-preview-canvas" data-preview></div><p style="margin:8px 0 0;color:#66716a;font-size:12px">Tip: drag an unlocked item on the preview to move it.</p></aside>'+
  '</div>';
  root.append(studio);

  const nav=document.createElement('nav');nav.setAttribute('aria-label','Stamp maker modes');
  nav.style.cssText='display:flex;flex-wrap:wrap;gap:8px;margin:18px 0';
  nav.innerHTML='<button type="button" data-mode="quick">Quick Templates</button><button type="button" data-mode="nepali">Nepali Stamp</button><button type="button" data-mode="studio">Stamp Studio</button>';
  const heading=root.querySelector('.stamp-heading');if(heading)heading.after(nav);
  const switchMode=mode=>{
    const gallery=root.querySelector('.stamp-sample-gallery'),countrySection=root.querySelector('[data-country-stamps]'),templatePanel=root.querySelector('.stamp-template-panel'),layout=root.querySelector('.stamp-layout'),quickEditor=root.querySelector('[data-quick-editor-bar]'),quickSections=[...root.querySelectorAll('[data-quick-original-section]')];
    const quickEditing=root.dataset.quickEditing==='true',countryEditing=root.dataset.countryEditing==='true',quickAdvanced=root.dataset.quickAdvanced==='true';
    if(gallery)gallery.hidden=mode!=='quick';
    if(countrySection)countrySection.hidden=mode!=='country';
    if(mode==='studio'){
      if(templatePanel)templatePanel.hidden=true;if(layout)layout.hidden=true;if(quickEditor)quickEditor.hidden=true;studio.hidden=false;
    }else if(mode==='nepali'){
      if(templatePanel)templatePanel.hidden=false;if(layout)layout.hidden=false;if(quickEditor)quickEditor.hidden=true;quickSections.forEach(section=>section.hidden=false);studio.hidden=true;
    }else if(mode==='country'){
      if(templatePanel)templatePanel.hidden=true;if(layout)layout.hidden=!countryEditing;if(quickEditor)quickEditor.hidden=!countryEditing;quickSections.forEach(section=>section.hidden=countryEditing&&!quickAdvanced);studio.hidden=true;
    }else{
      if(templatePanel)templatePanel.hidden=true;if(layout)layout.hidden=!quickEditing;if(quickEditor)quickEditor.hidden=!quickEditing;quickSections.forEach(section=>section.hidden=quickEditing&&!quickAdvanced);studio.hidden=true;
    }
    nav.querySelectorAll('button[data-mode]').forEach(btn=>{
      const active=btn.dataset.mode===mode;btn.setAttribute('aria-pressed',String(active));
      btn.style.cssText='padding:10px 15px;border-radius:9px;border:1px solid '+(active?'#1767c0':'#d6dce5')+';background:'+(active?'#eaf3ff':'#fff')+';font-weight:700;cursor:pointer';
    });
  };
  nav.querySelectorAll('button').forEach(btn=>btn.onclick=()=>switchMode(btn.dataset.mode));

  const presetBox=studio.querySelector('[data-presets]'),preview=studio.querySelector('[data-preview]'),itemsBox=studio.querySelector('[data-items]'),props=studio.querySelector('[data-properties]');
  const allPresets=presets();
  allPresets.forEach(p=>{
    const b=document.createElement('button');b.type='button';b.className='ak-template-card';b.dataset.presetName=p.name;
    const thumb=document.createElement('span');thumb.className='ak-template-thumb';
    thumb.innerHTML=studioSvg({items:JSON.parse(JSON.stringify(p.items)),widthMm:p.w,heightMm:p.h,transparent:false,texture:false,saturation:100,brightness:100,zoom:1,selected:null},true);
    const label=document.createElement('strong');label.textContent=p.name;b.append(thumb,label);
    b.onclick=()=>applyChange(()=>{state.items=JSON.parse(JSON.stringify(p.items));state.widthMm=p.w;state.heightMm=p.h;state.selected=state.items[0]?.id||null;state.activePreset=p.name;studio.querySelector('[data-step="2"]').open=true});
    presetBox.append(b);
  });
  studio.querySelector('[data-new-blank]').onclick=()=>{if(state.items.length&&!confirm('Start a blank stamp? Your current design will be replaced.'))return;applyChange(()=>{state.items=[];state.selected=null;state.activePreset='Blank';state.widthMm=42;state.heightMm=42})};

  studio.querySelector('[data-quick-apply]').onclick=()=>{
    const name=clean(studio.querySelector('[data-quick-name]').value||'YOUR BUSINESS NAME'),address=clean(studio.querySelector('[data-quick-address]').value||'YOUR LOCATION'),center=clean(studio.querySelector('[data-quick-center]').value||'AUTHORIZED');
    applyChange(()=>{
      const texts=state.items.filter(i=>i.type==='text'||i.type==='arcText');
      if(texts[0])texts[0].text=name;else state.items.push({...baseItem('text'),text:name,y:200});
      if(texts[1])texts[1].text=address;else state.items.push({...baseItem('text'),text:address,y:255,size:21});
      if(center){if(texts[2])texts[2].text=center;else state.items.push({...baseItem('text'),text:center,y:305,size:23})}
    });studio.querySelector('[data-step="3"]').open=true;toast('Details applied. You can still change each item.');
  };

  const addBox=studio.querySelector('[data-add-buttons]');
  [['text','Text'],['arcText','Curved text'],['ring','Circle / ring'],['ellipse','Oval'],['rect','Rectangle'],['frame','Decorative frame'],['triangle','Triangle'],['line','Line']].forEach(([type,label])=>{
    const b=document.createElement('button');b.type='button';b.textContent='+ '+label;b.onclick=()=>applyChange(()=>{const e=baseItem(type);state.items.push(e);state.selected=e.id});addBox.append(b);
  });
  const imageBtn=document.createElement('button');imageBtn.type='button';imageBtn.textContent='+ Logo / image';addBox.append(imageBtn);
  const imageInput=document.createElement('input');imageInput.type='file';imageInput.accept='image/png,image/jpeg,image/webp,image/svg+xml';imageInput.hidden=true;studio.append(imageInput);
  imageBtn.onclick=()=>imageInput.click();
  imageInput.onchange=async()=>{try{const src=await readImage(imageInput.files?.[0]);applyChange(()=>{const e={...baseItem('image'),src};state.items.push(e);state.selected=e.id});toast('Image added. Drag it on the preview.')}catch(e){toast(e.message||'Could not add image.')}finally{imageInput.value=''}};

  const symbolWrap=document.createElement('select');symbolWrap.innerHTML='<option value="">+ Built-in symbol</option>';
  const cats={};SYMBOLS.forEach(([cat,name,src],idx)=>{if(!cats[cat]){cats[cat]=document.createElement('optgroup');cats[cat].label=cat;symbolWrap.append(cats[cat])}const o=document.createElement('option');o.value=idx;o.textContent=name;cats[cat].append(o)});
  symbolWrap.onchange=()=>{if(symbolWrap.value==='')return;const [,name,src]=SYMBOLS[Number(symbolWrap.value)];applyChange(()=>{const e={...baseItem('image'),src,w:90,h:90};state.items.push(e);state.selected=e.id});symbolWrap.value='';toast(name+' symbol added.');};
  addBox.append(symbolWrap);

  function nameFor(e){return({text:'Text',arcText:'Curved text',ring:'Ring',ellipse:'Oval',rect:'Rectangle',frame:'Frame',triangle:'Triangle',line:'Line',image:'Image'})[e.type]||'Item'}
  function updatePreview(){
    preview.innerHTML=studioSvg(state);
    const svg=preview.querySelector('svg');if(!svg)return;
    svg.style.cssText='width:min(100%,560px);height:auto;max-height:560px;transform:scale('+state.zoom+');transform-origin:center;touch-action:none';
    studio.querySelector('[data-zoom-label]').textContent=Math.round(state.zoom*100)+'%';
    let drag=null;
    svg.addEventListener('pointerdown',ev=>{
      const t=ev.target.closest('[data-element]');if(!t)return;
      const id=Number(t.dataset.element),item=state.items.find(i=>i.id===id);if(!item)return;
      state.selected=id;renderItems();renderProps();
      if(item.locked){toast('This item is locked. Unlock it before moving.');return}
      const rect=svg.getBoundingClientRect();drag={id,rect,start:copy(),startX:item.x,startY:item.y,startX2:item.x2,startY2:item.y2,target:t};svg.setPointerCapture(ev.pointerId);
    });
    svg.addEventListener('pointermove',ev=>{
      if(!drag)return;const e=state.items.find(i=>i.id===drag.id);if(!e)return;
      const x=clamp((ev.clientX-drag.rect.left)*500/drag.rect.width,0,500),y=clamp((ev.clientY-drag.rect.top)*500/drag.rect.height,0,500),dx=x-drag.startX,dy=y-drag.startY;
      e.x=x;e.y=y;if(e.type==='line'){e.x2=clamp((drag.startX2||e.x2)+dx,0,500);e.y2=clamp((drag.startY2||e.y2)+dy,0,500)}
      if(drag.target)drag.target.style.transform='translate('+dx+'px,'+dy+'px)';
    });
    svg.addEventListener('pointerup',()=>{if(drag){undo.push(drag.start);if(undo.length>40)undo.shift();redo=[];drag=null;renderAll();autoSave()}});
    svg.addEventListener('pointercancel',()=>{if(drag){drag=null;renderAll()}});
  }
  function renderItems(){
    itemsBox.replaceChildren();
    if(!state.items.length){itemsBox.textContent='No items yet. Add text, a ring, shape, logo or symbol above.';return}
    state.items.forEach((e,index)=>{
      const row=document.createElement('div');row.style.cssText='display:grid;grid-template-columns:minmax(0,1fr) repeat(5,auto);gap:4px;align-items:center';
      const pick=document.createElement('button');pick.type='button';pick.textContent=(e.locked?'🔒 ':'')+(e.visible?'':'◌ ')+nameFor(e)+(e.text?' — '+clean(e.text,22):'');pick.style.cssText='min-width:0;text-align:left;padding:8px;border:1px solid '+(state.selected===e.id?'#1767c0':'#e1e5ea')+';border-radius:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';pick.onclick=()=>{state.selected=e.id;renderItems();renderProps()};
      const lock=document.createElement('button');lock.type='button';lock.textContent=e.locked?'🔒':'🔓';lock.title=e.locked?'Unlock item':'Lock item';lock.onclick=()=>applyChange(()=>e.locked=!e.locked);
      const vis=document.createElement('button');vis.type='button';vis.textContent=e.visible?'👁':'◌';vis.title='Show or hide';vis.onclick=()=>applyChange(()=>e.visible=!e.visible);
      const dup=document.createElement('button');dup.type='button';dup.textContent='⧉';dup.title='Duplicate';dup.onclick=()=>applyChange(()=>{const c={...JSON.parse(JSON.stringify(e)),id:uid(),locked:false,x:clamp((e.x||250)+12,0,500),y:clamp((e.y||250)+12,0,500)};state.items.push(c);state.selected=c.id});
      const up=document.createElement('button');up.type='button';up.textContent='↑';up.title='Move forward';up.onclick=()=>{if(index>=state.items.length-1)return;applyChange(()=>{const t=state.items[index+1];state.items[index+1]=e;state.items[index]=t})};
      const down=document.createElement('button');down.type='button';down.textContent='↓';down.title='Move backward';down.onclick=()=>{if(index<=0)return;applyChange(()=>{const t=state.items[index-1];state.items[index-1]=e;state.items[index]=t})};
      row.append(pick,lock,vis,dup,up,down);itemsBox.append(row);
    });
  }
  function prop(label,key,input,help=''){
    const e=state.items.find(i=>i.id===state.selected);if(!e)return;
    input.onchange=()=>applyChange(()=>{let v=input.type==='checkbox'?input.checked:input.value;if(input.type==='number')v=Number(v);e[key]=v});
    props.append(inputRow(label,input,help));
  }
  function renderProps(){
    props.replaceChildren();const e=state.items.find(i=>i.id===state.selected);if(!e){props.innerHTML='<p style="color:#66716a">Click an item in the preview or item list to edit it.</p>';return}
    const head=document.createElement('div');head.style.cssText='display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin:12px 0 8px';
    const strong=document.createElement('strong');strong.textContent='Edit '+nameFor(e);
    const actions=document.createElement('div');actions.style.cssText='display:flex;gap:5px;flex-wrap:wrap';
    const centerX=document.createElement('button');centerX.type='button';centerX.textContent='Center ↔';centerX.onclick=()=>applyChange(()=>{const dx=250-e.x;e.x=250;if(e.type==='line')e.x2=clamp(e.x2+dx,0,500)});
    const centerY=document.createElement('button');centerY.type='button';centerY.textContent='Center ↕';centerY.onclick=()=>applyChange(()=>{const dy=250-e.y;e.y=250;if(e.type==='line')e.y2=clamp(e.y2+dy,0,500)});
    const duplicate=document.createElement('button');duplicate.type='button';duplicate.textContent='Duplicate';duplicate.onclick=()=>applyChange(()=>{const c={...JSON.parse(JSON.stringify(e)),id:uid(),locked:false,x:clamp((e.x||250)+12,0,500),y:clamp((e.y||250)+12,0,500)};state.items.push(c);state.selected=c.id});
    const del=document.createElement('button');del.type='button';del.textContent='Delete';del.onclick=()=>applyChange(()=>{state.items=state.items.filter(i=>i.id!==e.id);state.selected=state.items[0]?.id||null});
    actions.append(centerX,centerY,duplicate,del);head.append(strong,actions);props.append(head);
    const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:9px';props.append(grid);
    const add=(label,key,input,help='')=>{input.onchange=()=>applyChange(()=>{let v=input.type==='checkbox'?input.checked:input.value;if(input.type==='number')v=Number(v);e[key]=v});grid.append(inputRow(label,input,help))};
    if(e.type==='text'||e.type==='arcText'){add('Words','text',textInput(e.text));add('Font','font',selectInput(e.font,FONTS));add('Text size','size',numberInput(e.size,8,90));add('Letter spacing','spacing',numberInput(e.spacing||0,0,20,.5));add('Boldness','weight',selectInput(e.weight||700,[[400,'Regular'],[600,'Semi-bold'],[700,'Bold'],[800,'Extra bold']]));}
    if(e.type==='text'){add('Rotation','rotation',numberInput(e.rotation||0,0,360));add('Alignment','align',selectInput(e.align||'middle',[['start','Left'],['middle','Center'],['end','Right']]));add('Reverse / white text','invert',checkInput(e.invert),'Adds a colored block behind white text.');}
    if(e.type==='arcText'){add('Circle radius','radius',numberInput(e.radius,40,230));add('Start angle','start',numberInput(e.start,-360,360));add('Arc length','sweep',numberInput(e.sweep,10,359));add('Direction','direction',selectInput(e.direction,[['forward','Forward'],['reverse','Reverse / bottom']]));}
    if(['ring'].includes(e.type)){add('Ring size','radius',numberInput(e.radius,20,235));add('Border thickness','thickness',numberInput(e.thickness,1,25));add('Border style','dash',selectInput(e.dash||'solid',[['solid','Solid'],['dashed','Dashed'],['dotted','Dotted'],['broken','Broken']]));}
    if(e.type==='ellipse'){add('Width radius','rx',numberInput(e.rx,20,240));add('Height radius','ry',numberInput(e.ry,20,240));add('Border thickness','thickness',numberInput(e.thickness,1,25));add('Border style','dash',selectInput(e.dash||'solid',[['solid','Solid'],['dashed','Dashed'],['dotted','Dotted'],['broken','Broken']]));}
    if(['rect','frame','triangle'].includes(e.type)){add('Width','w',numberInput(e.w,20,470));add('Height','h',numberInput(e.h,20,470));add('Border thickness','thickness',numberInput(e.thickness,1,25));add('Border style','dash',selectInput(e.dash||'solid',[['solid','Solid'],['dashed','Dashed'],['dotted','Dotted'],['broken','Broken']]));}
    if(e.type==='rect'||e.type==='frame')add('Corner roundness','rx',numberInput(e.rx||0,0,80));
    if(e.type==='frame')add('Frame style','frameStyle',selectInput(e.frameStyle||'double',[['double','Double'],['single','Single']]));
    if(e.type==='line'){add('End X','x2',numberInput(e.x2,0,500));add('End Y','y2',numberInput(e.y2,0,500));add('Thickness','thickness',numberInput(e.thickness,1,25));add('Line style','dash',selectInput(e.dash||'solid',[['solid','Solid'],['dashed','Dashed'],['dotted','Dotted']]));}
    if(e.type==='image'){add('Width','w',numberInput(e.w,20,300));add('Height','h',numberInput(e.h,20,300));}
    if(e.type!=='image')add('Color','ink',colorInput(e.ink));
    add('Horizontal position','x',numberInput(e.x,0,500));add('Vertical position','y',numberInput(e.y,0,500));add('Show this item','visible',checkInput(e.visible));add('Lock this item','locked',checkInput(e.locked),'Locked items cannot be dragged accidentally.');
  };

  function renderSheet(){
    const box=studio.querySelector('[data-sheet]');box.replaceChildren();
    const sizes=document.createElement('select');sizes.innerHTML='<option value="">Common stamp sizes</option>';SIZE_PRESETS.forEach((p,i)=>{const o=document.createElement('option');o.value=i;o.textContent=p[0];sizes.append(o)});sizes.onchange=()=>{if(sizes.value==='')return;const p=SIZE_PRESETS[Number(sizes.value)];applyChange(()=>{state.widthMm=p[1];state.heightMm=p[2]});sizes.value=''};box.append(inputRow('Ready-made physical size',sizes,'Size is in millimeters.'));
    const sizeGrid=document.createElement('div');sizeGrid.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:9px';
    const wi=numberInput(state.widthMm,10,120,.5),hi=numberInput(state.heightMm,10,120,.5);wi.onchange=()=>applyChange(()=>state.widthMm=clamp(wi.value,10,120));hi.onchange=()=>applyChange(()=>state.heightMm=clamp(hi.value,10,120));sizeGrid.append(inputRow('Width (mm)',wi),inputRow('Height (mm)',hi));box.append(sizeGrid);
    const inkBlock=document.createElement('div');inkBlock.innerHTML='<strong style="display:block;margin-bottom:6px">Quick ink colors</strong>';const swatches=document.createElement('div');swatches.style.cssText='display:flex;gap:7px;flex-wrap:wrap';INKS.forEach(c=>{const b=document.createElement('button');b.type='button';b.title=c;b.style.cssText='width:30px;height:30px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px #cbd5e1;background:'+c;b.onclick=()=>applyChange(()=>state.items.forEach(e=>{if(e.type!=='image')e.ink=c}));swatches.append(b)});inkBlock.append(swatches);box.append(inkBlock);
    const effects=document.createElement('div');effects.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:9px';
    const sat=numberInput(state.saturation,0,200),bright=numberInput(state.brightness,30,170),trans=checkInput(state.transparent),texture=checkInput(state.texture);
    sat.onchange=()=>applyChange(()=>state.saturation=clamp(sat.value,0,200));bright.onchange=()=>applyChange(()=>state.brightness=clamp(bright.value,30,170));trans.onchange=()=>applyChange(()=>state.transparent=trans.checked);texture.onchange=()=>applyChange(()=>state.texture=texture.checked);
    effects.append(inputRow('Color saturation %',sat),inputRow('Brightness %',bright),inputRow('Transparent background',trans),inputRow('Worn rubber effect',texture));box.append(effects);
  }
  function renderExport(){
    const box=studio.querySelector('[data-export]');if(box.childElementCount)return;
    const make=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;box.append(b)};
    const allowed=()=>{if(studio.querySelector('[data-authorized]').checked)return true;toast('Confirm authorization before downloading.');return false};
    make('PNG',async()=>{if(!allowed())return;const canvas=await canvasFromSvg(studioSvg(state,true),1800,Math.max(500,Math.round(1800*state.heightMm/state.widthMm))),blob=await canvasBlob(canvas);blobDownload(blob,'akeluwastamp.png')});
    make('SVG',()=>{if(!allowed())return;blobDownload(new Blob([studioSvg(state,true)],{type:'image/svg+xml;charset=utf-8'}),'akeluwastamp.svg')});
    make('PDF',async()=>{if(!allowed())return;try{if(!window.PDFLib)throw new Error('PDF library unavailable');const canvas=await canvasFromSvg(studioSvg(state,true),1600,Math.max(450,Math.round(1600*state.heightMm/state.widthMm))),png=await canvasBlob(canvas),pdf=await window.PDFLib.PDFDocument.create(),img=await pdf.embedPng(await png.arrayBuffer()),pw=state.widthMm*72/25.4,ph=state.heightMm*72/25.4,page=pdf.addPage([pw,ph]);page.drawImage(img,{x:0,y:0,width:pw,height:ph});blobDownload(new Blob([await pdf.save()],{type:'application/pdf'}),'akeluwastamp.pdf')}catch(e){toast('Could not create PDF.')}} );
    make('DOCX',async()=>{if(!allowed())return;try{blobDownload(await docxBlob(state),'akeluwastamp.docx')}catch(e){console.error(e);toast('Could not create DOCX.')}});
    make('EPS',async()=>{if(!allowed())return;try{blobDownload(await epsBlob(state),'akeluwastamp.eps')}catch(e){console.error(e);toast('Could not create EPS.')}});
    make('Save project',()=>blobDownload(new Blob([JSON.stringify({version:3,state},null,2)],{type:'application/json'}),'akeluwastamp-project.json'));
    const saveLocal=document.createElement('button');saveLocal.type='button';saveLocal.textContent='Save in browser';saveLocal.onclick=()=>{localStorage.setItem('akeluwastamp-project-v3',JSON.stringify({version:2,state}));toast('Project saved in this browser.')};box.append(saveLocal);
    const loadLocal=document.createElement('button');loadLocal.type='button';loadLocal.textContent='Open browser save';loadLocal.onclick=()=>{try{const v=JSON.parse(localStorage.getItem('akeluwastamp-project-v3')||'null');if(!v?.state)throw Error();remember();state=v.state;renderAll();toast('Saved project opened.')}catch{toast('No saved project found in this browser.')}};box.append(loadLocal);
    const load=document.createElement('button');load.type='button';load.textContent='Open project file';box.append(load);
    const inp=document.createElement('input');inp.type='file';inp.accept='.json,application/json';inp.hidden=true;studio.append(inp);load.onclick=()=>inp.click();inp.onchange=async()=>{try{const v=JSON.parse(await inp.files[0].text());if(!v?.state||!Array.isArray(v.state.items))throw Error();remember();state=v.state;renderAll();toast('Project opened.')}catch{toast('Could not open that project file.')}finally{inp.value=''}};
  }
  function updatePresetSelection(){
    studio.querySelectorAll('[data-preset-name]').forEach(btn=>{
      const active=btn.dataset.presetName===state.activePreset;
      btn.style.borderColor=active?'#1767c0':'#dbe1e8';
      btn.style.boxShadow=active?'0 0 0 2px #1767c018':'none';
    });
  }
  function renderAll(){
    updatePreview();renderItems();renderProps();renderSheet();renderExport();updatePresetSelection();
    studio.querySelector('[data-undo]').disabled=!undo.length;studio.querySelector('[data-redo]').disabled=!redo.length;
    studio.querySelector('[data-reset-selected]').disabled=!state.items.some(i=>i.id===state.selected);
  }
  function resetSelected(){
    const index=state.items.findIndex(i=>i.id===state.selected);if(index<0)return;
    applyChange(()=>{
      const current=state.items[index],fresh=baseItem(current.type);
      fresh.id=current.id;fresh.locked=false;
      if('text' in current)fresh.text=current.text;
      if(current.type==='image')fresh.src=current.src;
      state.items[index]=fresh;
    });
    toast('Selected item reset.');
  }
  function resetWhole(){
    if(!confirm('Reset the whole stamp to its starting design? Current changes will be replaced.'))return;
    applyChange(()=>{
      const p=allPresets.find(x=>x.name===state.activePreset);
      if(p){state.items=JSON.parse(JSON.stringify(p.items));state.widthMm=p.w;state.heightMm=p.h;state.selected=state.items[0]?.id||null}
      else{state.items=[];state.selected=null;state.widthMm=42;state.heightMm=42}
      state.transparent=true;state.texture=false;state.saturation=100;state.brightness=100;state.zoom=1;
    });
    toast('Whole stamp reset.');
  }
  function newDesign(){
    if(state.items.length&&!confirm('Create a new blank design? Your current design will be replaced.'))return;
    applyChange(()=>{state.items=[];state.selected=null;state.widthMm=42;state.heightMm=42;state.transparent=true;state.texture=false;state.saturation=100;state.brightness=100;state.zoom=1;state.activePreset='Blank'});
    toast('New blank design ready.');
  }
  function goDownload(){
    const step=studio.querySelector('[data-step="4"]');step.open=true;
    const controls=studio.querySelector('[data-controls]');controls.scrollTo({top:Math.max(0,step.offsetTop-10),behavior:'smooth'});
  }
  studio.querySelector('[data-undo]').onclick=()=>{if(!undo.length)return;redo.push(copy());restore(undo.pop())};
  studio.querySelector('[data-redo]').onclick=()=>{if(!redo.length)return;undo.push(copy());restore(redo.pop())};
  studio.querySelector('[data-new-design]').onclick=newDesign;
  studio.querySelector('[data-reset-selected]').onclick=resetSelected;
  studio.querySelector('[data-reset-all]').onclick=resetWhole;
  studio.querySelector('[data-go-download]').onclick=goDownload;
  studio.querySelector('[data-go-download-bottom]').onclick=goDownload;
  studio.querySelector('[data-zoom-in]').onclick=()=>{state.zoom=Math.min(1.6,state.zoom+.1);updatePreview()};
  studio.querySelector('[data-zoom-out]').onclick=()=>{state.zoom=Math.max(.6,state.zoom-.1);updatePreview()};
  studio.querySelector('[data-reset-view]').onclick=()=>{state.zoom=1;updatePreview()};
  studio.querySelector('[data-fit]').onclick=()=>{
    const svg=preview.querySelector('svg');if(!svg)return;
    const baseWidth=svg.getBoundingClientRect().width/Math.max(.1,state.zoom),available=Math.max(120,preview.clientWidth-40);
    state.zoom=clamp(available/baseWidth,.6,1.35);updatePreview();preview.scrollTo({top:0,left:0,behavior:'smooth'});
  };

  const first=allPresets[0];
  let restored=false;
  try{
    const saved=JSON.parse(localStorage.getItem(autosaveKey)||'null');
    if(saved?.version===3&&saved.state&&Array.isArray(saved.state.items)){state=saved.state;restored=true}
  }catch{}
  if(!restored){state.items=JSON.parse(JSON.stringify(first.items));state.widthMm=first.w;state.heightMm=first.h;state.selected=state.items[0]?.id||null;state.activePreset=first.name}
  renderAll();autoSave();switchMode('quick');
  return {switchMode};
}
