const $ = (id) => document.getElementById(id);

const defaults = {
  name: 'AKELUWA Softwarehub',
  address: 'Kathmandu, Nepal',
  nepali: 'अकेलुवा सफ्टवेयर हब',
  registration: '',
  center: 'AUTHORIZED',
  estb: 'ESTB 2082-08-02',
  date: '',
  template: 'round',
  color: '#0b4ea2',
  font: 'Arial',
  border: 6,
  fontSize: 28,
  curve: 165,
  logoSize: 94,
  logoY: -38,
  innerRing: true,
  outerRing: true,
  transparent: true,
  texture: false,
  languageMode: 'both',
  englishPlace: 'top',
  nepaliPlace: 'bottom',
  addressPlace: 'hidden',
  estbPlace: 'center',
  englishRotate: 0,
  nepaliRotate: 0,
  addressRotate: 0,
  estbRotate: 0,
  ringStyle: 'double',
  textLayout: 'split',
  dots: true,
  autoFit: true,
  fullText: 'AKELUWA SOFTWARE HUB · KATHMANDU, NEPAL',
  fullRotate: 0,
  fullSpacing: 10,
  innerGap: 45,
  innerStroke: 3,
  outerSize: 199,
  outerStroke: 5,
};

const templateDefaults = {
  round: { center:'AUTHORIZED' },
  double: { center:'ESTABLISHED' },
  oval: { center:'AUTHORIZED' },
  rect: { center:'AUTHORIZED' },
  date: { center:'DATE' },
  authorized: { center:'AUTHORIZED' },
  paid: { center:'PAID' },
  received: { center:'RECEIVED' },
};

function esc(value='') {
  return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function clean(value='', max=90) {
  return String(value).trim().replace(/\s+/g,' ').slice(0,max);
}
function safeColor(value) {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : defaults.color;
}
function fontFamily(value) {
  const allowed = ['Arial','Georgia','Trebuchet MS','Verdana','Times New Roman'];
  return allowed.includes(value) ? value : 'Arial';
}
function dateLabel(value) {
  if (!value) return '';
  const d = new Date(value + 'T00:00:00');
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'2-digit'});
}
function readLogo(file) {
  return new Promise((resolve,reject) => {
    if (!file) return resolve(null);
    if (file.size > 4*1024*1024) return reject(new Error('Logo must be smaller than 4 MB.'));
    if (!['image/png','image/jpeg','image/webp','image/svg+xml'].includes(file.type)) return reject(new Error('Use PNG, JPG, WebP, or SVG.'));
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read the logo.'));
    reader.readAsDataURL(file);
  });
}
function fileName(name, ext) {
  const base = clean(name || 'digital-stamp').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'digital-stamp';
  return `${base}-stamp.${ext}`;
}
function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function fittedSize(text, requested, available, autoFit) {
  if (!autoFit) return requested;
  const chars = Math.max(1, Array.from(clean(text,180)).length);
  const estimated = available / (chars * .62);
  return Math.max(12, Math.min(requested, estimated));
}
function arcText(id, text, color, font, size, weight=700, rotation=0, letter=1, available=500, autoFit=true) {
  if (!clean(text,180)) return '';
  const start = 50 + Number(rotation) / 3.6;
  const resolvedSize = fittedSize(text, size, available, autoFit);
  return `<text fill="${color}" font-family="${esc(font)}" font-size="${resolvedSize}" font-weight="${weight}" letter-spacing="${letter}" text-anchor="middle"><textPath href="#${id}" startOffset="${start}%">${esc(clean(text,180))}</textPath></text>`;
}
function fullCircleText(state, pathId, color, font, radius) {
  const text = clean(state.fullText,180);
  if (!text) return '';
  const circumference = 2 * Math.PI * radius;
  const spacing = Number(state.fullSpacing) / 10;
  return arcText(pathId,text,color,font,Number(state.fontSize),800,state.fullRotate,spacing,circumference * .9,state.autoFit);
}
function blockVisible(state, key) {
  if (key === 'english' && state.languageMode === 'nepali') return false;
  if (key === 'nepali' && state.languageMode === 'english') return false;
  return true;
}
function textBlock(state, key) {
  const map = {
    english: { text: state.name, place: state.englishPlace, rotation: state.englishRotate },
    nepali: { text: state.nepali, place: state.nepaliPlace, rotation: state.nepaliRotate },
    address: { text: state.address, place: state.addressPlace, rotation: state.addressRotate },
    estb: { text: state.estb, place: state.estbPlace, rotation: state.estbRotate },
  };
  return map[key];
}
function textureDef(enabled) {
  if (!enabled) return '';
  return `<filter id="stampTexture"><feTurbulence type="fractalNoise" baseFrequency=".65" numOctaves="2" seed="9" result="noise"/><feComposite in="noise" in2="SourceGraphic" operator="in" result="grain"/><feBlend in="SourceGraphic" in2="grain" mode="multiply"/></filter>`;
}
function logoMarkup(state, x=250, y=238) {
  if (!state.logoData) return '';
  const size = Number(state.logoSize);
  const w = 70 + size;
  const h = 60 + size * .72;
  const py = y - h/2 + Number(state.logoY);
  return `<image href="${esc(state.logoData)}" x="${x-w/2}" y="${py}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>`;
}
function innerText(state, y=285) {
  const c = safeColor(state.color);
  const f = fontFamily(state.font);
  const size = Number(state.fontSize);
  const centerLines = [];
  for (const key of ['english','nepali','address','estb']) {
    const block = textBlock(state,key);
    if (blockVisible(state,key) && block.place === 'center' && clean(block.text)) centerLines.push(clean(block.text,80));
  }
  if (clean(state.center)) centerLines.push(clean(state.center,30).toUpperCase());
  if (clean(state.registration)) centerLines.push(clean(state.registration,46).toUpperCase());
  const date = dateLabel(state.date).toUpperCase();
  if (date) centerLines.push(date);
  const lineGap = Math.max(24, size + 2);
  const startY = y - ((centerLines.length - 1) * lineGap) / 2;
  return centerLines.map((line,index)=>`<text x="250" y="${startY + index*lineGap}" text-anchor="middle" fill="${c}" font-family="${esc(f)}" font-size="${index===0?size:Math.max(14,size-7)}" font-weight="${index===0?900:700}" letter-spacing=".7">${esc(line)}</text>`).join('');
}
function circularSeal(state, kind='round') {
  const c=safeColor(state.color), f=fontFamily(state.font), b=Number(state.border), fs=Number(state.fontSize);
  const baseOuter = Math.max(150, Math.min(235, Number(state.outerSize || 205)));
  const rx = kind==='oval' ? Math.min(235, baseOuter + 13) : baseOuter;
  const ry = kind==='oval' ? Math.max(120, baseOuter * .78) : baseOuter;
  const radius = Math.max(120,Math.min(195,Number(state.curve)));
  const textRx = kind==='oval' ? Math.min(190,radius+20) : radius;
  const textRy = kind==='oval' ? Math.min(128,radius*.75) : radius;
  const left=250-textRx,right=250+textRx;
  const ringStyle = state.ringStyle === 'single' ? 'single' : 'double';
  const showInner = ringStyle === 'double';
  const paths = `
    <path id="topArc" d="M ${left} 250 A ${textRx} ${textRy} 0 0 1 ${right} 250" fill="none"/>
    <path id="bottomArc" d="M ${right} 250 A ${textRx} ${textRy} 0 0 1 ${left} 250" fill="none"/>
    <path id="fullArc" d="M 250 ${250-textRy} A ${textRx} ${textRy} 0 1 1 249.9 ${250-textRy}" fill="none"/>
  `;
  let ringText='';
  if (state.textLayout === 'full') {
    ringText = fullCircleText(state,'fullArc',c,f,Math.min(textRx,textRy));
  } else {
    const topBlocks=[], bottomBlocks=[], fullRingBlocks=[];
    for (const key of ['english','nepali','address','estb']) {
      const item=textBlock(state,key);
      if (!blockVisible(state,key) || !clean(item.text)) continue;
      const place = state.textLayout === 'split' && item.place !== 'ring'
        ? (key === 'english' ? 'top' : key === 'nepali' ? 'bottom' : item.place)
        : item.place;
      if (place==='top') topBlocks.push({key,...item});
      if (place==='bottom') bottomBlocks.push({key,...item});
      if (place==='ring') fullRingBlocks.push({key,...item});
    }
    const halfLength = Math.PI * Math.sqrt((textRx*textRx + textRy*textRy)/2) * .82;
    const circumference = 2 * Math.PI * Math.sqrt((textRx*textRx + textRy*textRy)/2);
    const topMarkup=topBlocks.map((item,index)=>arcText('topArc',item.text,c,f,Math.max(16,fs-index*3),index?700:800,item.rotation,1,halfLength,state.autoFit)).join('');
    const bottomMarkup=bottomBlocks.map((item,index)=>arcText('bottomArc',item.text,c,f,Math.max(16,fs-3-index*3),700,item.rotation,.6,halfLength,state.autoFit)).join('');
    const ringMarkup=fullRingBlocks.map((item,index)=>arcText('fullArc',item.text,c,f,Math.max(14,fs-index*2),index?700:800,item.rotation,.8,circumference*.92,state.autoFit)).join('');
    ringText = topMarkup + bottomMarkup + ringMarkup;
  }
  const dots = state.dots && state.textLayout !== 'full'
    ? `<circle cx="${250-rx+28}" cy="250" r="5" fill="${c}"/><circle cx="${250+rx-28}" cy="250" r="5" fill="${c}"/>`
    : '';
  return `
    <defs>${textureDef(state.texture)}${paths}</defs>
    <g ${state.texture?'filter="url(#stampTexture)"':''}>
      <ellipse cx="250" cy="250" rx="${rx}" ry="${ry}" fill="none" stroke="${c}" stroke-width="${Math.max(1,Number(state.outerStroke||b))}"/>
      ${showInner ? `<ellipse cx="250" cy="250" rx="${Math.max(40,rx-Number(state.innerGap||24))}" ry="${Math.max(40,ry-Number(state.innerGap||24))}" fill="none" stroke="${c}" stroke-width="${Math.max(1,Number(state.innerStroke||3))}"/>` : ''}
      ${dots}
      ${ringText}
      ${logoMarkup(state,250,230)}
      ${innerText(state,state.logoData?305:270)}
    </g>`;
}
function rectangleSeal(state, mode='rect') {
  const c=safeColor(state.color), f=fontFamily(state.font), b=Number(state.border), fs=Number(state.fontSize);
  const center = mode==='authorized'?'AUTHORIZED':mode==='paid'?'PAID':mode==='received'?'RECEIVED':clean(state.center,30).toUpperCase();
  const date = dateLabel(state.date);
  return `
    <defs>${textureDef(state.texture)}</defs>
    <g ${state.texture?'filter="url(#stampTexture)"':''}>
      ${state.outerRing?`<rect x="38" y="94" width="424" height="312" rx="18" fill="none" stroke="${c}" stroke-width="${b}"/>`:''}
      ${state.innerRing?`<rect x="56" y="112" width="388" height="276" rx="12" fill="none" stroke="${c}" stroke-width="${Math.max(2,b*.5)}"/>`:''}
      <text x="250" y="160" text-anchor="middle" fill="${c}" font-family="${esc(f)}" font-size="${fs+2}" font-weight="900">${esc(clean(state.name,60).toUpperCase())}</text>
      <line x1="90" y1="182" x2="410" y2="182" stroke="${c}" stroke-width="2"/>
      ${logoMarkup(state,250,235)}
      <text x="250" y="${state.logoData?310:250}" text-anchor="middle" fill="${c}" font-family="${esc(f)}" font-size="${Math.max(30,fs+8)}" font-weight="900" letter-spacing="2">${esc(center)}</text>
      ${clean(state.estb)?`<text x="250" y="${state.logoData?340:286}" text-anchor="middle" fill="${c}" font-family="${esc(f)}" font-size="17" font-weight="800">${esc(clean(state.estb,28))}</text>`:''}
      <text x="250" y="365" text-anchor="middle" fill="${c}" font-family="${esc(f)}" font-size="16" font-weight="700">${esc(clean(state.address,70))}${date?' · '+esc(date):''}</text>
    </g>`;
}
function dateSeal(state) {
  const c=safeColor(state.color), f=fontFamily(state.font), b=Number(state.border), fs=Number(state.fontSize);
  const date = dateLabel(state.date) || new Date().toLocaleDateString();
  return `
    <defs>${textureDef(state.texture)}</defs>
    <g ${state.texture?'filter="url(#stampTexture)"':''}>
      <rect x="52" y="130" width="396" height="240" rx="14" fill="none" stroke="${c}" stroke-width="${b}"/>
      ${state.innerRing?`<rect x="70" y="148" width="360" height="204" rx="8" fill="none" stroke="${c}" stroke-width="${Math.max(2,b*.5)}"/>`:''}
      <text x="250" y="190" text-anchor="middle" fill="${c}" font-family="${esc(f)}" font-size="${fs}" font-weight="900">${esc(clean(state.name,60).toUpperCase())}</text>
      <text x="250" y="265" text-anchor="middle" fill="${c}" font-family="${esc(f)}" font-size="38" font-weight="900">${esc(date)}</text>
      <text x="250" y="310" text-anchor="middle" fill="${c}" font-family="${esc(f)}" font-size="18" font-weight="700">${esc(clean(state.address,70))}</text>
    </g>`;
}
function buildSvg(state, transparentOverride=null) {
  const transparent = transparentOverride===null ? state.transparent : transparentOverride;
  let body='';
  if(state.template==='round') body=circularSeal(state,'round');
  else if(state.template==='double') body=circularSeal(state,'double');
  else if(state.template==='oval') body=circularSeal(state,'oval');
  else if(state.template==='date') body=dateSeal(state);
  else if(['authorized','paid','received'].includes(state.template)) body=rectangleSeal(state,state.template);
  else body=rectangleSeal(state,'rect');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 500 500" role="img" aria-label="Digital stamp preview">
    ${transparent?'':`<rect width="500" height="500" fill="#ffffff"/>`}
    ${body}
  </svg>`;
}

export function initDigitalStamp({toast=()=>{}}={}) {
  const form=$('stampForm'); if(!form) return;
  const fields={
    name:$('stampName'),address:$('stampAddress'),nepali:$('stampNepali'),registration:$('stampRegistration'),
    center:$('stampCenterText'),estb:$('stampEstb'),date:$('stampDate'),color:$('stampColor'),font:$('stampFont'),
    border:$('stampBorder'),fontSize:$('stampFontSize'),curve:$('stampCurve'),logoSize:$('stampLogoSize'),logoY:$('stampLogoY'),
    innerRing:$('stampInnerRing'),outerRing:$('stampOuterRing'),transparent:$('stampTransparent'),texture:$('stampTexture'),
    logo:$('stampLogo'),authorized:$('stampAuthorized'),languageMode:$('stampLanguageMode'),
    englishPlace:$('stampEnglishPlace'),nepaliPlace:$('stampNepaliPlace'),addressPlace:$('stampAddressPlace'),estbPlace:$('stampEstbPlace'),
    englishRotate:$('stampEnglishRotate'),nepaliRotate:$('stampNepaliRotate'),addressRotate:$('stampAddressRotate'),estbRotate:$('stampEstbRotate'),
    ringStyle:$('stampRingStyle'),textLayout:$('stampTextLayout'),dots:$('stampDots'),autoFit:$('stampAutoFit'),
    fullText:$('stampFullText'),fullRotate:$('stampFullRotate'),fullSpacing:$('stampFullSpacing'),
    innerGap:$('stampInnerGap'),innerStroke:$('stampInnerStroke'),outerSize:$('stampOuterSize'),outerStroke:$('stampOuterStroke')
  };
  const preview=$('stampPreview'),status=$('stampStatus'),clearLogo=$('clearStampLogo');
  let template='round',logoData=null,zoom=1;

  function state(){return{
    name:fields.name.value,address:fields.address.value,nepali:fields.nepali.value,registration:fields.registration.value,
    center:fields.center.value,estb:fields.estb.value,date:fields.date.value,template,color:fields.color.value,font:fields.font.value,
    border:fields.border.value,fontSize:fields.fontSize.value,curve:fields.curve.value,logoSize:fields.logoSize.value,logoY:fields.logoY.value,
    innerRing:fields.innerRing.checked,outerRing:fields.outerRing.checked,transparent:fields.transparent.checked,texture:fields.texture.checked,logoData,
    languageMode:fields.languageMode.value,englishPlace:fields.englishPlace.value,nepaliPlace:fields.nepaliPlace.value,addressPlace:fields.addressPlace.value,estbPlace:fields.estbPlace.value,
    englishRotate:fields.englishRotate.value,nepaliRotate:fields.nepaliRotate.value,addressRotate:fields.addressRotate.value,estbRotate:fields.estbRotate.value,
    ringStyle:fields.ringStyle.value,textLayout:fields.textLayout.value,dots:fields.dots.checked,autoFit:fields.autoFit.checked,
    fullText:fields.fullText.value,fullRotate:fields.fullRotate.value,fullSpacing:fields.fullSpacing.value,
    innerGap:fields.innerGap.value,innerStroke:fields.innerStroke.value,outerSize:fields.outerSize.value,outerStroke:fields.outerStroke.value
  }}
  function ready(){const hasLanguage=fields.languageMode.value==='nepali'?clean(fields.nepali.value):fields.languageMode.value==='english'?clean(fields.name.value):(clean(fields.name.value)||clean(fields.nepali.value));return Boolean(fields.authorized.checked && hasLanguage)}
  function outputs(){
    $('stampBorderOut').textContent=fields.border.value;$('stampFontOut').textContent=fields.fontSize.value;
    $('stampCurveOut').textContent=fields.curve.value;$('stampLogoOut').textContent=fields.logoSize.value;$('stampLogoYOut').textContent=fields.logoY.value;
    $('stampEnglishRotateOut').textContent=fields.englishRotate.value+'°';$('stampNepaliRotateOut').textContent=fields.nepaliRotate.value+'°';
    $('stampAddressRotateOut').textContent=fields.addressRotate.value+'°';$('stampEstbRotateOut').textContent=fields.estbRotate.value+'°';
    $('stampFullRotateOut').textContent=fields.fullRotate.value+'°';$('stampFullSpacingOut').textContent=(Number(fields.fullSpacing.value)/10).toFixed(1);
    $('stampInnerGapOut').textContent=fields.innerGap.value;$('stampInnerStrokeOut').textContent=fields.innerStroke.value;
    $('stampOuterSizeOut').textContent=fields.outerSize.value;$('stampOuterStrokeOut').textContent=fields.outerStroke.value;
    $('stampInnerRingControls').classList.toggle('stamp-double-hidden',fields.ringStyle.value!=='double');
  }
  function render(){
    outputs();preview.innerHTML=buildSvg(state());
    preview.style.transform=`scale(${zoom})`;$('stampZoomLabel').textContent=Math.round(zoom*100)+'%';
    document.querySelectorAll('.stamp-template').forEach(btn=>btn.classList.toggle('active',btn.dataset.template===template));
    const ok=ready();['downloadStampPng','downloadStampTransparent','downloadStampSvg'].forEach(id=>$(id).disabled=!ok);
    status.textContent=ok?'Ready to download. All export options are free.':'Add the English or Nepali text you want, then confirm you are authorized to create and use this stamp.';
  }
  function chooseTemplate(next){
    template=next in templateDefaults?next:'round';
    const def=templateDefaults[template];
    if(def?.center) fields.center.value=def.center;
    if(template==='double') fields.ringStyle.value='double';
    render();
  }
  document.querySelectorAll('.stamp-template,.stamp-mini').forEach(btn=>btn.addEventListener('click',()=>chooseTemplate(btn.dataset.template)));
  form.addEventListener('input',render);form.addEventListener('change',render);
  fields.logo.addEventListener('change',async()=>{
    try{logoData=await readLogo(fields.logo.files?.[0]||null);clearLogo.disabled=!logoData;render()}
    catch(error){fields.logo.value='';logoData=null;clearLogo.disabled=true;render();toast(error.message||'Could not use that logo.')}
  });
  clearLogo.addEventListener('click',()=>{logoData=null;fields.logo.value='';clearLogo.disabled=true;render()});
  $('stampZoomIn').addEventListener('click',()=>{zoom=Math.min(1.5,zoom+.1);render()});
  $('stampZoomOut').addEventListener('click',()=>{zoom=Math.max(.7,zoom-.1);render()});
  $('stampReset').addEventListener('click',()=>{
    template=defaults.template;logoData=null;zoom=1;
    Object.entries({name:'name',address:'address',nepali:'nepali',registration:'registration',center:'center',estb:'estb',date:'date',color:'color',font:'font',border:'border',fontSize:'fontSize',curve:'curve',logoSize:'logoSize',logoY:'logoY'}).forEach(([key,id])=>fields[id].value=defaults[key]);
    fields.innerRing.checked=defaults.innerRing;fields.outerRing.checked=defaults.outerRing;fields.transparent.checked=defaults.transparent;fields.texture.checked=defaults.texture;
    fields.languageMode.value=defaults.languageMode;fields.englishPlace.value=defaults.englishPlace;fields.nepaliPlace.value=defaults.nepaliPlace;fields.addressPlace.value=defaults.addressPlace;fields.estbPlace.value=defaults.estbPlace;
    fields.englishRotate.value=defaults.englishRotate;fields.nepaliRotate.value=defaults.nepaliRotate;fields.addressRotate.value=defaults.addressRotate;fields.estbRotate.value=defaults.estbRotate;
    fields.ringStyle.value=defaults.ringStyle;fields.textLayout.value=defaults.textLayout;fields.dots.checked=defaults.dots;fields.autoFit.checked=defaults.autoFit;
    fields.fullText.value=defaults.fullText;fields.fullRotate.value=defaults.fullRotate;fields.fullSpacing.value=defaults.fullSpacing;
    fields.innerGap.value=defaults.innerGap;fields.innerStroke.value=defaults.innerStroke;fields.outerSize.value=defaults.outerSize;fields.outerStroke.value=defaults.outerStroke;
    fields.authorized.checked=false;fields.logo.value='';clearLogo.disabled=true;render()
  });
  async function exportPng(forceTransparent=null){
    if(!ready()) return toast('Please confirm you are authorized to create this stamp.');
    const svg=buildSvg(state(),forceTransparent), blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob),img=new Image();
    try{
      await new Promise((res,rej)=>{img.onload=res;img.onerror=rej;img.src=url});
      const canvas=document.createElement('canvas');canvas.width=1800;canvas.height=1800;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,1800,1800);ctx.drawImage(img,0,0,1800,1800);
      const png=await new Promise(res=>canvas.toBlob(res,'image/png'));if(!png)throw new Error('PNG export failed');
      downloadBlob(png,fileName(fields.name.value,'png'));toast('PNG stamp downloaded.')
    }catch(e){console.error(e);toast('Could not export PNG. Try SVG.')}finally{URL.revokeObjectURL(url)}
  }
  $('downloadStampPng').addEventListener('click',()=>exportPng(false));
  $('downloadStampTransparent').addEventListener('click',()=>exportPng(true));
  $('downloadStampSvg').addEventListener('click',()=>{
    if(!ready())return toast('Please confirm you are authorized to create this stamp.');
    downloadBlob(new Blob([buildSvg(state())],{type:'image/svg+xml;charset=utf-8'}),fileName(fields.name.value,'svg'));toast('SVG stamp downloaded.')
  });
  render();
}
