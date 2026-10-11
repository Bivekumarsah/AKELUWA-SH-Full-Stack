const COUNTRIES=[
  {id:'np',flag:'🇳🇵',name:'Nepal',languages:['English','Nepali'],location:'Kathmandu, Nepal'},
  {id:'in',flag:'🇮🇳',name:'India',languages:['English','Hindi'],location:'India'},
  {id:'us',flag:'🇺🇸',name:'United States',languages:['English'],location:'United States'},
  {id:'uk',flag:'🇬🇧',name:'United Kingdom',languages:['English'],location:'United Kingdom'},
  {id:'ae',flag:'🇦🇪',name:'United Arab Emirates',languages:['English','Arabic'],location:'United Arab Emirates'},
  {id:'sa',flag:'🇸🇦',name:'Saudi Arabia',languages:['Arabic','English'],location:'Saudi Arabia'},
  {id:'qa',flag:'🇶🇦',name:'Qatar',languages:['Arabic','English'],location:'Qatar'},
  {id:'au',flag:'🇦🇺',name:'Australia',languages:['English'],location:'Australia'},
  {id:'ca',flag:'🇨🇦',name:'Canada',languages:['English','French'],location:'Canada'},
  {id:'de',flag:'🇩🇪',name:'Germany',languages:['German','English'],location:'Germany'},
  {id:'fr',flag:'🇫🇷',name:'France',languages:['French','English'],location:'France'},
  {id:'jp',flag:'🇯🇵',name:'Japan',languages:['Japanese','English'],location:'Japan'},
  {id:'cn',flag:'🇨🇳',name:'China',languages:['Chinese','English'],location:'China'},
  {id:'bd',flag:'🇧🇩',name:'Bangladesh',languages:['Bangla','English'],location:'Bangladesh'},
  {id:'pk',flag:'🇵🇰',name:'Pakistan',languages:['Urdu','English'],location:'Pakistan'}
];

const CATEGORIES=[
  ['company','Company & Business',['Company seal','Corporate stamp','Private limited company','Partnership business','Proprietorship','Trading company','Manufacturer','Authorized signatory','Business address','Company logo stamp']],
  ['government','Government & Public Office',['Government department','Municipality','Ward office','Administrative office','Public institution','Departmental office','Office received','Office dispatch']],
  ['education','Education',['School','College','University','Principal','Headmaster','Examination department','Library','Admission office','Education consultancy','Training institute']],
  ['medical','Medical & Healthcare',['Doctor','Hospital','Clinic','Dentist','Pharmacist','Laboratory','Nurse','Medical consultant','Healthcare organization']],
  ['legal','Legal & Judicial',['Advocate','Lawyer','Legal consultant','Notary template','Law firm','Legal office','Document verification']],
  ['accounting','Accounting & Finance',['Chartered accountant','Auditor','Accounting firm','Tax consultant','Financial consultant','Bookkeeper','Finance department']],
  ['engineering','Engineering & Architecture',['Civil engineer','Architect','Structural engineer','Electrical engineer','Mechanical engineer','Engineering consultant','Design approval','Construction engineer']],
  ['banking','Banking & Insurance',['Banking office','Branch stamp','Finance company','Insurance office','Document received','Internal verification','Payment processing']],
  ['personal','Personal & Signature',['Personal name','Signature stamp','Initials','Monogram','Address stamp','Personal logo','Custom text']],
  ['office','Office & Administration',['Received','Approved','Rejected','Verified','Confidential','Urgent','Copy','Original','Draft','Completed','Pending']],
  ['date','Date & Number',['Date stamp','Serial number','Invoice number','Reference number','Document tracking','Date and signature']],
  ['logistics','Postal & Logistics',['Dispatched','Delivered','Received','Shipped','Warehouse','Logistics company','Courier service']],
  ['quality','Quality & Inspection',['QC passed','Inspected','Quality checked','Tested','Rejected','Inspection date','Production verification']],
  ['construction','Construction & Real Estate',['Contractor','Construction company','Property agency','Real estate consultant','Site engineer','Project office']],
  ['ngo','NGO & Nonprofit',['NGO','Foundation','Charity','Association','Community organization','Social organization','Club']],
  ['community','Religious & Community',['Temple','Church','Mosque','Religious organization','Community group','Cultural organization']],
  ['hospitality','Hospitality & Tourism',['Hotel','Restaurant','Travel agency','Tourism company','Guesthouse','Tour operator']],
  ['retail','Retail & E-commerce',['Paid','Cash received','Return accepted','Warranty','Seller','Shop','Retail business']],
  ['creative','Creative & Decorative',['Wedding','Monogram','Handmade','Personal brand','Decorative logo','Gift stamp','Vintage stamp']],
  ['digital','Digital Document & PDF',['Electronic stamp image','Watermark','Document status','Draft','Internal review','Approved','Received','Custom document label']]
].map(([id,name,subcategories])=>({id,name,subcategories}));

const REGULATED_CATEGORIES=new Set(['government','banking']);
const REGULATED_SUBCATEGORIES=new Set(['Notary template']);
const SHAPES=['Round','Double ring','Oval','Rectangle','Square','Text only','Logo based','Date'];
const PURPOSES=['Business','Professional','Administrative','Personal','Document status'];

const categoryStyle={
  company:{kind:'double',color:'#0b4ea2',center:'COMPANY',shape:'Double ring',purpose:'Business'},
  government:{kind:'received',color:'#6b7280',center:'SAMPLE',shape:'Rectangle',purpose:'Administrative'},
  education:{kind:'round',color:'#0f766e',center:'EDUCATION',shape:'Round',purpose:'Professional'},
  medical:{kind:'oval',color:'#146c43',center:'PROFESSIONAL',shape:'Oval',purpose:'Professional'},
  legal:{kind:'double',color:'#374151',center:'LEGAL',shape:'Double ring',purpose:'Professional'},
  accounting:{kind:'double',color:'#1d4ed8',center:'ACCOUNTING',shape:'Double ring',purpose:'Professional'},
  engineering:{kind:'round',color:'#7c3aed',center:'ENGINEERING',shape:'Round',purpose:'Professional'},
  banking:{kind:'received',color:'#6b7280',center:'SAMPLE',shape:'Rectangle',purpose:'Administrative'},
  personal:{kind:'round',color:'#be123c',center:'PERSONAL',shape:'Round',purpose:'Personal'},
  office:{kind:'received',color:'#a42424',center:'RECEIVED',shape:'Rectangle',purpose:'Administrative'},
  date:{kind:'date',color:'#374151',center:'DATE',shape:'Date',purpose:'Administrative'},
  logistics:{kind:'rect',color:'#b45309',center:'LOGISTICS',shape:'Rectangle',purpose:'Business'},
  quality:{kind:'authorized',color:'#146c43',center:'QUALITY CHECKED',shape:'Rectangle',purpose:'Business'},
  construction:{kind:'double',color:'#92400e',center:'PROJECT',shape:'Double ring',purpose:'Professional'},
  ngo:{kind:'round',color:'#0f766e',center:'ORGANIZATION',shape:'Round',purpose:'Business'},
  community:{kind:'round',color:'#7c2d12',center:'COMMUNITY',shape:'Round',purpose:'Personal'},
  hospitality:{kind:'oval',color:'#9d174d',center:'HOSPITALITY',shape:'Oval',purpose:'Business'},
  retail:{kind:'paid',color:'#146c43',center:'PAID',shape:'Rectangle',purpose:'Business'},
  creative:{kind:'round',color:'#7e22ce',center:'HANDMADE',shape:'Round',purpose:'Personal'},
  digital:{kind:'authorized',color:'#0369a1',center:'DOCUMENT',shape:'Rectangle',purpose:'Document status'}
};

function slug(v=''){return String(v).toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
function titleCase(v=''){return String(v).replace(/\b\w/g,c=>c.toUpperCase())}
function hash(v=''){let h=0;for(const c of String(v))h=(h*31+c.charCodeAt(0))>>>0;return h}
function templateFor(country,category,subcategory,variant=0){
  const base=categoryStyle[category.id]||categoryStyle.company;
  const h=hash(country.id+category.id+subcategory+variant);
  const styles=[
    {suffix:'Classic',kind:base.kind,shape:base.shape},
    {suffix:'Compact',kind:h%2?'oval':'rect',shape:h%2?'Oval':'Rectangle'},
    {suffix:'Professional',kind:h%3?'double':'round',shape:h%3?'Double ring':'Round'}
  ];
  const v=styles[variant%styles.length];
  const regulated=REGULATED_CATEGORIES.has(category.id)||REGULATED_SUBCATEGORIES.has(subcategory);
  const actionWord=['RECEIVED','AUTHORIZED','VERIFIED','APPROVED','PAID','DISPATCHED','QUALITY CHECKED'].find(x=>subcategory.toUpperCase().includes(x.split(' ')[0]));
  const center=regulated?'SAMPLE — AUTHORIZED USE':(actionWord||base.center||subcategory.toUpperCase());
  return {
    id:[country.id,category.id,slug(subcategory),variant].join('-'),
    name:country.name+' · '+subcategory+' · '+v.suffix,
    country:country.id,countryName:country.name,category:category.id,categoryName:category.name,
    subcategory,shape:v.shape,kind:v.kind,color:base.color,purpose:base.purpose,
    languages:country.languages,regulated,
    defaultFont:'Arial',dimensions:v.kind==='rect'||v.kind==='received'||v.kind==='authorized'||v.kind==='paid'?'58 × 22 mm':v.kind==='oval'?'55 × 32 mm':'42 × 42 mm',
    sample:{
      label:subcategory+' — '+v.suffix,
      kind:v.kind,
      name:regulated?'SAMPLE ORGANIZATION':('SAMPLE '+titleCase(subcategory).toUpperCase()),
      address:country.location,
      center,
      color:base.color,
      languageMode:'english',
      nepaliPlace:'hidden',
      addressPlace:v.kind==='round'||v.kind==='double'?'bottom':'center',
      estbPlace:'hidden',
      ringStyle:v.kind==='double'?'double':'single',
      fullText:(subcategory+' · '+country.name).toUpperCase()
    }
  };
}
function allTemplatesFor(country,category,subcategory){
  const list=[];
  const subs=subcategory?[subcategory]:category.subcategories;
  for(const sub of subs){
    const count=REGULATED_CATEGORIES.has(category.id)||REGULATED_SUBCATEGORIES.has(sub)?1:3;
    for(let i=0;i<count;i++)list.push(templateFor(country,category,sub,i));
  }
  return list;
}
function previewSvg(t){
  const c=t.color,regulated=t.regulated;
  if(t.kind==='oval')return '<svg viewBox="0 0 160 100"><ellipse cx="80" cy="50" rx="68" ry="37" fill="none" stroke="'+c+'" stroke-width="4"/><text x="80" y="47" text-anchor="middle" font-size="11" font-weight="700" fill="'+c+'">'+(regulated?'SAMPLE':t.subcategory.slice(0,18).toUpperCase())+'</text><text x="80" y="65" text-anchor="middle" font-size="8" fill="'+c+'">'+t.countryName+'</text></svg>';
  if(['rect','received','authorized','paid','date'].includes(t.kind))return '<svg viewBox="0 0 160 100"><rect x="12" y="24" width="136" height="52" rx="6" fill="none" stroke="'+c+'" stroke-width="4"/><text x="80" y="48" text-anchor="middle" font-size="11" font-weight="700" fill="'+c+'">'+(regulated?'SAMPLE':t.subcategory.slice(0,18).toUpperCase())+'</text><text x="80" y="64" text-anchor="middle" font-size="8" fill="'+c+'">'+t.countryName+'</text></svg>';
  return '<svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="50" fill="none" stroke="'+c+'" stroke-width="4"/>'+(t.kind==='double'?'<circle cx="60" cy="60" r="39" fill="none" stroke="'+c+'" stroke-width="2"/>':'')+'<text x="60" y="58" text-anchor="middle" font-size="10" font-weight="700" fill="'+c+'">'+(regulated?'SAMPLE':t.subcategory.slice(0,15).toUpperCase())+'</text><text x="60" y="73" text-anchor="middle" font-size="7" fill="'+c+'">'+t.countryName+'</text></svg>';
}

export function initCountryStamps({root,toast=()=>{},onChoose=()=>{},switchMode=()=>{}}={}){
  if(!root||root.querySelector('[data-country-stamps]'))return;
  const section=document.createElement('section');section.dataset.countryStamps='1';section.hidden=true;
  section.style.cssText='margin:18px 0;padding:18px;border:1px solid #dfe3e8;border-radius:14px;background:#fff';
  section.innerHTML='<style>'+
    '[data-country-stamps] button,[data-country-stamps] select,[data-country-stamps] input{font:inherit}'+
    '[data-country-stamps] button{cursor:pointer}'+
    '[data-country-stamps] .cs-step{border:1px solid #e3e7ec;border-radius:12px;padding:15px;margin-top:12px;background:#fff}'+
    '[data-country-stamps] .cs-country-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:8px}'+
    '[data-country-stamps] .cs-country{padding:11px;border:1px solid #dbe1e8;border-radius:9px;background:#fff;text-align:left}'+
    '[data-country-stamps] .cs-country[aria-pressed="true"]{border-color:#1767c0;background:#eef6ff;box-shadow:0 0 0 2px #1767c018}'+
    '[data-country-stamps] .cs-filters{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:9px}'+
    '[data-country-stamps] select,[data-country-stamps] input[type="search"]{width:100%;box-sizing:border-box;padding:9px;border:1px solid #cfd6df;border-radius:8px;background:#fff}'+
    '[data-country-stamps] .cs-template-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;margin-top:12px}'+
    '[data-country-stamps] .cs-template{display:grid;gap:8px;padding:10px;border:1px solid #dbe1e8;border-radius:10px;background:#fff;text-align:left}'+
    '[data-country-stamps] .cs-thumb{height:125px;display:grid;place-items:center;background:#f8fafc;border-radius:8px;overflow:hidden}'+
    '[data-country-stamps] .cs-thumb svg{max-width:130px;max-height:110px}'+
    '[data-country-stamps] .cs-meta{font-size:11px;color:#66716a}'+
    '[data-country-stamps] .cs-warning{padding:9px;border-radius:8px;background:#fff7ed;color:#9a3412;font-size:12px}'+
  '</style>'+
  '<div><p style="margin:0;color:#1767c0;font-weight:800;font-size:12px">COUNTRY BASED STAMP</p><h2 style="margin:4px 0 6px">Choose country → work → template → customize</h2><p style="margin:0;color:#66716a">Templates are artwork samples for authorized business and organization use. Country collection does not mean official approval.</p></div>'+
  '<div class="cs-step"><h3 style="margin:0 0 8px">Step 1 — Select Country</h3><div class="cs-country-grid" data-countries></div></div>'+
  '<div class="cs-step"><h3 style="margin:0 0 8px">Step 2 — Choose Work Category</h3><div class="cs-filters"><label>Category<select data-category></select></label><label>Subcategory<select data-subcategory></select></label></div></div>'+
  '<div class="cs-step"><h3 style="margin:0 0 8px">Step 3 — Select Ready-Made Template</h3><div class="cs-filters"><label>Search<input type="search" data-search placeholder="Search stamp name or profession"></label><label>Shape<select data-shape></select></label><label>Language<select data-language></select></label><label>Purpose<select data-purpose></select></label></div><div data-regulated-note></div><div class="cs-template-grid" data-templates></div></div>'+
  '<div class="cs-step"><h3 style="margin:0 0 6px">Step 4 — Customize Stamp</h3><p style="margin:0;color:#66716a">Choose a template above. It will open the easy same-page editor with live preview.</p></div>'+
  '<div class="cs-step"><h3 style="margin:0 0 6px">Step 5 — Preview and Download</h3><p style="margin:0;color:#66716a">Use the editor download controls for PNG, transparent PNG, SVG and PDF where available.</p></div>';
  const gallery=root.querySelector('.stamp-sample-gallery'),studio=root.querySelector('[data-ak-studio]');
  if(studio)studio.before(section);else if(gallery)gallery.after(section);else root.append(section);

  const nav=root.querySelector('nav[aria-label="Stamp maker modes"]');
  if(nav&&!nav.querySelector('[data-mode="country"]')){
    const btn=document.createElement('button');btn.type='button';btn.dataset.mode='country';btn.textContent='Country Based Stamp';btn.onclick=()=>switchMode('country');
    const studioBtn=nav.querySelector('[data-mode="studio"]');if(studioBtn)nav.insertBefore(btn,studioBtn);else nav.append(btn);
  }

  let country=COUNTRIES[0],category=CATEGORIES[0],subcategory=category.subcategories[0];
  const countriesBox=section.querySelector('[data-countries]'),categorySel=section.querySelector('[data-category]'),subSel=section.querySelector('[data-subcategory]'),search=section.querySelector('[data-search]'),shape=section.querySelector('[data-shape]'),language=section.querySelector('[data-language]'),purpose=section.querySelector('[data-purpose]'),templatesBox=section.querySelector('[data-templates]'),note=section.querySelector('[data-regulated-note]');

  COUNTRIES.forEach(c=>{const b=document.createElement('button');b.type='button';b.className='cs-country';b.dataset.country=c.id;b.innerHTML='<span style="font-size:22px">'+c.flag+'</span> <strong>'+c.name+'</strong><div style="font-size:10px;color:#66716a;margin-top:3px">'+c.languages.join(' · ')+'</div>';b.onclick=()=>{country=c;renderCountries();renderLanguage();renderTemplates()};countriesBox.append(b)});
  CATEGORIES.forEach(c=>{const o=document.createElement('option');o.value=c.id;o.textContent=c.name;categorySel.append(o)});
  shape.innerHTML='<option value="">All shapes</option>'+SHAPES.map(v=>'<option>'+v+'</option>').join('');
  purpose.innerHTML='<option value="">All purposes</option>'+PURPOSES.map(v=>'<option>'+v+'</option>').join('');
  function renderCountries(){countriesBox.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.country===country.id)))}
  function renderSubcategories(){subSel.replaceChildren();category.subcategories.forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;subSel.append(o)});subcategory=category.subcategories[0];subSel.value=subcategory}
  function renderLanguage(){language.replaceChildren();const all=document.createElement('option');all.value='';all.textContent='All languages';language.append(all);country.languages.forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;language.append(o)})}
  function renderTemplates(){
    const q=search.value.trim().toLowerCase(),shapeFilter=shape.value,lang=language.value,p=purpose.value;
    let list=allTemplatesFor(country,category,subcategory);
    list=list.filter(t=>(!q||(t.name+' '+t.subcategory+' '+t.categoryName).toLowerCase().includes(q))&&(!shapeFilter||t.shape===shapeFilter)&&(!lang||t.languages.includes(lang))&&(!p||t.purpose===p));
    templatesBox.replaceChildren();
    const regulated=REGULATED_CATEGORIES.has(category.id)||REGULATED_SUBCATEGORIES.has(subcategory);
    note.innerHTML=regulated?'<div class="cs-warning">This area may involve regulated or official seals. AKELUWA provides only generic SAMPLE artwork here—no government emblem, protected mark, bank seal, or notarial seal. Verify local rules and use only when authorized.</div>':'';
    if(!list.length){templatesBox.innerHTML='<p style="color:#66716a">No template matches these filters. Clear a filter or choose another subcategory.</p>';return}
    list.forEach(t=>{
      const card=document.createElement('button');card.type='button';card.className='cs-template';
      card.innerHTML='<span class="cs-thumb">'+previewSvg(t)+'</span><strong>'+t.name+'</strong><span class="cs-meta">'+t.shape+' · '+t.dimensions+' · '+t.languages.join(', ')+'</span>'+(t.regulated?'<span class="cs-warning">Generic SAMPLE only</span>':'')+'<span style="color:#1767c0;font-weight:700">Customize this template →</span>';
      card.onclick=()=>{onChoose(t);toast('Country template loaded. Customize it below on this page.')};
      templatesBox.append(card);
    });
  }
  categorySel.onchange=()=>{category=CATEGORIES.find(c=>c.id===categorySel.value)||CATEGORIES[0];renderSubcategories();renderTemplates()};
  subSel.onchange=()=>{subcategory=subSel.value;renderTemplates()};
  [search,shape,language,purpose].forEach(el=>el.addEventListener(el===search?'input':'change',renderTemplates));
  renderCountries();renderSubcategories();renderLanguage();renderTemplates();

  return {section,countries:COUNTRIES,categories:CATEGORIES,subcategories:CATEGORIES.flatMap(c=>c.subcategories)};
}

export const COUNTRY_STAMP_COUNTS={
  countries:COUNTRIES.length,
  categories:CATEGORIES.length,
  subcategories:CATEGORIES.reduce((n,c)=>n+c.subcategories.length,0)
};
