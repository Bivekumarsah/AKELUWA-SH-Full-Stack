// Original, editable profession-specific designs for AKELUWA Country Based Stamp.
// No official insignia, government emblems, bank seals or notarial seals are supplied.
import { renderStampPreview } from './stamp-studio.js';

let nextElementId=900000;
const inkFor={
  company:'#1555A0',government:'#5B6472',education:'#087B75',medical:'#137C62',
  legal:'#343F59',accounting:'#235EB2',engineering:'#613DB3',banking:'#596878',
  personal:'#AB3859',office:'#B03A39',date:'#3D5068',logistics:'#B36B22',
  quality:'#16816B',construction:'#885B3B',ngo:'#11877C',community:'#906039',
  hospitality:'#A23570',retail:'#138063',creative:'#8330A6',digital:'#3071A8'
};
const layouts={
  company:['Company seal','Business monogram','Address ledger'],
  government:['Administrative sample','Sample document','Record received'],
  education:['Academic bookplate','Learning badge','Library card'],
  medical:['Clinic identity','Appointment panel','Care label'],
  legal:['Law office identity','Consultation card','Document desk'],
  accounting:['Accountant mark','Tax reference','Ledger label'],
  engineering:['Drafting emblem','Project specification','Technical office'],
  banking:['Document intake sample','Internal processing','Office record'],
  personal:['Personal monogram','Nameplate','Personal address'],
  office:['Document status','Office processing','Desk reference'],
  date:['Date and number','Dated record','Reference panel'],
  logistics:['Dispatch label','Parcel route','Delivery docket'],
  quality:['Quality checked','Inspection docket','Product inspection'],
  construction:['Site project','Real estate office','Contractor label'],
  ngo:['Community foundation','Volunteer identity','Association mark'],
  community:['Community gathering','Cultural group','Community note'],
  hospitality:['Hotel identity','Tour desk','Restaurant / guest label'],
  retail:['Retail paid','Store receipt','Returns and warranty'],
  creative:['Handmade maker','Creative monogram','Gift packaging'],
  digital:['Document watermark','Review workflow','Electronic document status']
};

const norm=(text,max=90)=>String(text||'').replace(/\s+/g,' ').trim().slice(0,max);
const id=()=>nextElementId++;
const base=(type,extra)=>({id:id(),type,visible:true,locked:false,...extra});
const ring=(radius=194,thickness=5,ink='#1555A0',extras={})=>base('ring',{x:250,y:250,radius,thickness,ink,dash:'solid',...extras});
const ellipse=(rx,ry,thickness,ink,extras={})=>base('ellipse',{x:250,y:250,rx,ry,thickness,ink,dash:'solid',...extras});
const rect=(w,h,thickness,ink,extras={})=>base('rect',{x:250,y:250,w,h,rx:14,thickness,ink,dash:'solid',...extras});
const line=(x,y,x2,y2,thickness,ink,extras={})=>base('line',{x,y,x2,y2,thickness,ink,dash:'solid',...extras});
const text=(value,x,y,size,ink,extras={})=>{
  const safe=norm(value,90),{fitWidth,...rest}=extras;
  const available=fitWidth||((x>275&&x<410)?280:395);
  const fitted=Math.max(13,Math.min(size,Math.floor(available/(Math.max(1,[...safe].length)*.56))));
  return base('text',{text:safe,x,y,size:fitted,ink,font:'Arial',weight:700,spacing:0,rotation:0,align:'middle',autoFit:true,maxTextWidth:available,...rest});
};
const arc=(value,r,start,sweep,size,ink,extras={})=>base('arcText',{text:norm(value,90),x:250,y:250,radius:r,start,sweep,size,ink,font:'Arial',weight:700,spacing:1,direction:'forward',autoFit:true,...extras});
const iconSvg=(name,ink)=>{
  const stroke='fill="none" stroke="'+ink+'" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"';
  const paths={
    briefcase:'<rect x="18" y="36" width="84" height="60" rx="8"/><path d="M43 36V20h34v16M18 60h84M56 58v13h10V58"/>',
    book:'<path d="M60 30c-13-14-27-15-45-11v70c18-5 32-3 45 11 13-14 27-16 45-11V19c-18-4-32-3-45 11zM60 30v70"/>',
    care:'<circle cx="60" cy="60" r="47"/><path d="M60 33v54M33 60h54"/>',
    scales:'<path d="M60 17v82M30 103h60M26 43h68M60 26H45M34 43L17 77h34L34 43zM87 43L70 77h34L87 43z"/>',
    calc:'<rect x="25" y="12" width="70" height="96" rx="8"/><rect x="37" y="26" width="46" height="20" rx="2"/><path d="M39 62h9M65 62h9M39 78h9M65 78h9M39 94h9M65 94h9"/>',
    ruler:'<path d="M20 92L92 20l16 16-72 72zM48 70l11 11M64 54l11 11M80 38l11 11"/>',
    document:'<path d="M32 12h42l17 18v78H32zM74 12v20h17M43 52h37M43 68h37M43 84h25"/>',
    person:'<circle cx="60" cy="37" r="17"/><path d="M26 103c0-21 12-33 34-33s34 12 34 33"/>',
    calendar:'<rect x="18" y="28" width="84" height="75" rx="7"/><path d="M18 49h84M39 18v20M81 18v20M40 67h12M67 67h12M40 86h12"/>',
    truck:'<path d="M14 28h58v55H14zM72 43h18l18 21v19H72zM79 43v21h29"/><circle cx="33" cy="88" r="11"/><circle cx="87" cy="88" r="11"/>',
    check:'<circle cx="60" cy="60" r="47"/><path d="M32 63l19 19 37-43"/>',
    roof:'<path d="M16 64L60 23l44 41M28 59v47h64V59M48 106V78h24v28"/>',
    leaf:'<path d="M102 19C56 18 25 34 22 72c29 18 71-1 80-53zM22 99c14-24 35-43 63-63"/>',
    people:'<circle cx="60" cy="35" r="13"/><circle cx="27" cy="51" r="11"/><circle cx="93" cy="51" r="11"/><path d="M43 101V82c0-19 10-27 17-27s17 8 17 27v19M9 103V80c0-13 9-20 21-20M111 103V80c0-13-9-20-21-20"/>',
    hotel:'<rect x="29" y="15" width="62" height="92" rx="5"/><path d="M40 32h13M67 32h13M40 49h13M67 49h13M40 66h13M67 66h13M51 107V83h18v24"/>',
    bag:'<rect x="26" y="41" width="68" height="62" rx="7"/><path d="M44 43V31c0-23 32-23 32 0v12"/>',
    sparkle:'<path d="M60 10L72 48l38 12-38 12-12 38-12-38-38-12 38-12z"/>',
    screen:'<rect x="17" y="25" width="86" height="63" rx="6"/><path d="M43 103h34M60 88v15M37 58l15 15 30-30"/>'
  };
  const nameSafe=Object.hasOwn(paths,name)?name:'document';
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><g '+stroke+'>'+paths[nameSafe]+'</g></svg>');
};
const icon=(name,x,y,w,ink)=>base('image',{x,y,w,h:w,src:iconSvg(name,ink)});
const CATEGORY_ICON={
  company:'briefcase',government:'document',education:'book',medical:'care',legal:'scales',
  accounting:'calc',engineering:'ruler',banking:'document',personal:'person',
  office:'document',date:'calendar',logistics:'truck',quality:'check',
  construction:'roof',ngo:'leaf',community:'people',hospitality:'hotel',
  retail:'bag',creative:'sparkle',digital:'screen'
};
const STATUS_WORDS={
  'received':'RECEIVED','paid':'PAID','approved':'APPROVED','rejected':'REJECTED','verified':'VERIFIED',
  'tested':'TESTED','shipped':'SHIPPED','delivered':'DELIVERED','dispatched':'DISPATCHED',
  'copy':'COPY','original':'ORIGINAL','draft':'DRAFT','completed':'COMPLETED','pending':'PENDING',
  'confidential':'CONFIDENTIAL','urgent':'URGENT','qc passed':'QC PASSED','inspected':'INSPECTED',
  'quality checked':'QUALITY CHECKED','return accepted':'RETURN ACCEPTED','warranty':'WARRANTY',
  'internal review':'IN REVIEW','document status':'DOCUMENT STATUS','cash received':'CASH RECEIVED'
};
const truncate=(v,max)=>norm(v,120).length>max?norm(v,120).slice(0,max-1)+'…':norm(v,120);
const keywordStatus=sub=>{
  const lower=sub.toLowerCase();
  const best=Object.entries(STATUS_WORDS).sort((a,b)=>b[0].length-a[0].length).find(([k])=>lower===k||lower.includes(k));
  return best?.[1]||null;
};

// Crop unused white workspace and preserve the artwork's physical aspect ratio.
// This prevents text and logos being stretched or squashed in SVG, PNG and PDF.
function designBounds(items){
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  const include=(x1,y1,x2,y2)=>{
    minX=Math.min(minX,x1);minY=Math.min(minY,y1);
    maxX=Math.max(maxX,x2);maxY=Math.max(maxY,y2);
  };
  for(const e of items){
    const x=e.x,y=e.y;
    if(e.type==='ring')include(x-e.radius,y-e.radius,x+e.radius,y+e.radius);
    else if(e.type==='arcText')include(x-e.radius-e.size,y-e.radius-e.size,x+e.radius+e.size,y+e.radius+e.size);
    else if(e.type==='ellipse')include(x-e.rx,y-e.ry,x+e.rx,y+e.ry);
    else if(e.type==='rect'||e.type==='frame'||e.type==='triangle'||e.type==='image')
      include(x-e.w/2,y-e.h/2,x+e.w/2,y+e.h/2);
    else if(e.type==='line')include(Math.min(x,e.x2),Math.min(y,e.y2),Math.max(x,e.x2),Math.max(y,e.y2));
    else if(e.type==='text'){
      const width=Math.max(20,[...e.text].length*e.size*.58);
      include(x-width/2,y-e.size*.8,x+width/2,y+e.size*.8);
    }
  }
  if(!Number.isFinite(minX))return [0,0,500,500];
  const margin=16;
  const bx=Math.floor(minX-margin),by=Math.floor(minY-margin);
  const bw=Math.ceil(maxX-minX+margin*2),bh=Math.ceil(maxY-minY+margin*2);
  return [bx,by,Math.max(30,bw),Math.max(30,bh)];
}

// Each profession has a distinct layout family. Variations change composition,
// geometry, decorations and hierarchy rather than only the heading.
function buildDesign(country,category,subcategory,variant){
  const cat=category.id,ink=inkFor[cat]||inkFor.company,location=country.location;
  const regulated=cat==='government'||cat==='banking'||subcategory==='Notary template';
  const status=keywordStatus(subcategory);
  const organization=regulated?'SAMPLE ORGANIZATION':({
    company:'SAMPLE COMPANY',education:'SAMPLE ACADEMY',medical:'SAMPLE CLINIC',
    legal:'SAMPLE LAW OFFICE',accounting:'SAMPLE ACCOUNTING',engineering:'SAMPLE ENGINEERING',
    personal:'SAMPLE NAME',office:'SAMPLE OFFICE',date:'SAMPLE OFFICE',
    logistics:'SAMPLE COURIER',quality:'SAMPLE QUALITY TEAM',construction:'SAMPLE PROJECT',
    ngo:'SAMPLE FOUNDATION',community:'SAMPLE COMMUNITY',hospitality:'SAMPLE HOTEL',
    retail:'SAMPLE STORE',creative:'SAMPLE MAKER',digital:'SAMPLE DOCUMENT'
  })[cat]||'SAMPLE BUSINESS';
  const primary=regulated?'SAMPLE':(status||truncate(subcategory.toUpperCase(),27));
  const smallLabel=truncate(subcategory.toUpperCase(),25);
  const iconName=CATEGORY_ICON[cat]||'document';
  let items=[],widthMm=42,heightMm=42,shape='Round';
  const add=(...it)=>items.push(...it);
  const business=(x,y,size=24,extras={})=>text(organization,x,y,size,ink,{role:'name',...extras});
  const place=(x,y,size=18,extras={})=>text(location,x,y,size,ink,{role:'address',...extras});
  const main=(x,y,size=30,extras={})=>text(primary,x,y,size,ink,{role:'center',...extras});
  const mark=(x,y,w)=>icon(iconName,x,y,w,ink);
  const bar=(y,x1=65,x2=435)=>line(x1,y,x2,y,3,ink);
  const footer=()=>{add(place(250,375,19));};
  if(regulated){
    // No protected seals. Only generic document-label artwork.
    widthMm=58;heightMm=24;shape='Rectangle';
    add(rect(438,230,5,ink,{rx:12}),line(35,182,465,182,3,ink),line(35,318,465,318,3,ink),
      text('SAMPLE — NOT AN OFFICIAL SEAL',250,150,18,ink,{weight:700}),
      main(250,237,38),business(250,284,20),place(250,342,14));
  }else if(variant===1&&['company','personal','creative','ngo'].includes(cat)){
    // Independent monogram / community logo compositions (not a recolored rectangle).
    widthMm=42;heightMm=42;shape=cat==='ngo'?'Logo based':'Square';
    add(rect(408,408,6,ink,{rx:cat==='creative'?46:14}),
      rect(366,366,2,ink,{rx:cat==='creative'?36:8}),
      mark(250,203,112),line(100,277,400,277,2,ink),
      business(250,321,27),main(250,363,21),place(250,407,16));
    if(cat==='creative')add(rect(445,445,2,ink,{dash:'dotted',rx:52}));
  }else if(variant===2&&cat==='education'){
    // Ruled admission / library card with a separate bookmark graphic.
    widthMm=56;heightMm=30;shape='Rectangle';
    add(rect(451,312,5,ink,{rx:7}),line(40,164,460,164,4,ink),
      mark(92,240,92),line(157,184,157,351,2,ink),
      text('EDUCATION RECORD',306,151,19,ink),
      business(306,219,23),main(306,275,25),
      line(188,310,430,310,2,ink),place(306,342,16));
  }else if(variant===2&&cat==='accounting'){
    // A compact ledger panel with ruled fields.
    widthMm=58;heightMm=28;shape='Rectangle';
    add(rect(452,292,5,ink,{rx:4}),line(38,165,462,165,4,ink),
      mark(89,224,68),text('ACCOUNTING / TAX RECORD',311,146,19,ink),
      line(40,290,460,290,2,ink),
      business(295,224,24),main(295,265,25),
      text('REF: __________',156,333,19,ink),place(337,333,16));
  }else if(variant===2&&cat==='engineering'){
    // Blueprint-style ruled title block.
    widthMm=59;heightMm=32;shape='Rectangle';
    add(rect(451,315,5,ink,{rx:2,dash:'dashed'}),
      line(36,166,464,166,4,ink),line(36,346,464,346,3,ink),
      line(167,166,167,346,2,ink),mark(104,241,90),
      text('TECHNICAL PROJECT',311,141,20,ink),
      business(315,219,22),main(315,275,24),place(315,317,16));
  }else if(variant===2&&cat==='logistics'){
    // Consignment docket with parcel symbol and dotted tracking rule.
    widthMm=58;heightMm=28;shape='Rectangle';
    add(rect(454,286,6,ink,{rx:5}),mark(93,224,99),
      line(174,144,174,351,3,ink),business(315,177,23),
      main(315,240,32),line(195,287,429,287,2,ink,{dash:'dotted'}),
      place(315,328,17),text('DELIVERY / TRACKING',310,366,16,ink));
  }else if(variant===2&&cat==='legal'){
    widthMm=59;heightMm=30;shape='Rectangle';
    add(rect(453,292,5,ink,{rx:6}),
      mark(103,218,95),line(165,157,165,346,3,ink),
      text('CONSULTATION / RECORD',313,165,18,ink),
      business(313,221,22),main(313,275,26),
      place(313,331,17));
  }else if(variant===2&&cat==='quality'){
    widthMm=48;heightMm=37;shape='Round';
    add(ring(210,6,ink),ring(179,3,ink,{dash:'dashed'}),mark(250,192,103),
      main(250,294,29),business(250,343,21),place(250,389,17));
  }else if(variant===2&&cat==='digital'){
    // Borderless watermark-like status, not a generic seal.
    widthMm=55;heightMm=30;shape='Text only';
    add(line(59,174,441,174,3,ink),
      mark(103,243,87),main(306,239,31),
      business(306,293,21),place(306,338,17),
      text('SAMPLE • NOT AN AUTHENTICATED SIGNATURE',250,395,16,ink));
  }else if(variant===1){
    // Profession-specific compact labels: vertical icon band + text hierarchy.
    widthMm=58;heightMm=26;shape='Rectangle';
    add(rect(454,260,5,ink,{rx:18}),line(157,124,157,376,4,ink),
      mark(94,231,78),text(smallLabel,302,174,20,ink,{weight:800}),
      main(302,224,31),business(302,279,20),place(302,328,15));
    if(['quality','office','logistics','retail','digital'].includes(cat))add(line(179,247,419,247,2,ink));
    if(cat==='education')add(line(195,245,419,245,2,ink));
    if(cat==='creative')add(rect(470,283,2,ink,{rx:24,dash:'dotted'}));
  }else if(variant===2){
    // Modern profession-specific landscape layouts with accent shape.
    widthMm=60;heightMm=26;shape='Rectangle';
    add(rect(458,260,5,ink,{rx:4}),rect(426,228,2,ink,{rx:1}),line(45,168,455,4,ink),
      mark(86,116,64),text(smallLabel,278,115,22,ink,{weight:800}),
      business(250,219,26),main(250,268,28),place(250,332,17));
    if(['engineering','construction','logistics'].includes(cat))add(line(65,353,435,353,3,ink,{dash:'dashed'}));
    if(['medical','quality'].includes(cat))add(mark(405,311,46));
    if(['creative','hospitality'].includes(cat))add(line(65,151,435,151,2,ink));
  }else switch(cat){
    case 'company':
      add(ring(209,6,ink),ring(159,3,ink),
        arc('SAMPLE BUSINESS',184,-145,110,27,ink,{role:'name'}),
        arc(location.toUpperCase(),184,35,110,21,ink,{role:'address',direction:'reverse'}),
        mark(250,231,78),main(250,310,25));
      shape='Double ring';break;
    case 'education':
      add(ring(211,6,ink),ring(169,2,ink),
        arc('LEARNING & TRAINING',189,-140,100,22,ink),
        mark(250,213,102),business(250,305,23),
        arc(location.toUpperCase(),185,40,100,18,ink,{role:'address',direction:'reverse'}),
        main(250,360,21));
      shape='Double ring';break;
    case 'medical':
      widthMm=55;heightMm=31;shape='Oval';
      add(ellipse(224,153,7,ink),ellipse(198,125,2,ink),
        mark(124,251,90),line(180,144,180,356,3,ink),
        main(321,215,31),business(321,266,19),place(321,317,16));
      break;
    case 'legal':
      widthMm=55;heightMm=32;shape='Rectangle';
      add(rect(437,305,6,ink,{rx:8}),line(51,151,449,151,3,ink),
        mark(250,221,85),business(250,316,26),main(250,369,22),place(250,385,16));
      break;
    case 'accounting':
      widthMm=58;heightMm=27;shape='Rectangle';
      add(rect(450,295,5,ink,{rx:8}),line(52,182,448,182,3,ink),
        mark(95,240,80),line(157,196,157,345,3,ink),
        business(302,220,24),main(302,270,26),place(302,315,16));
      break;
    case 'engineering':
      widthMm=55;heightMm=35;shape='Rectangle';
      add(rect(436,329,5,ink,{dash:'dashed',rx:4}),
        line(63,137,437,137,4,ink),line(63,371,437,371,3,ink),
        mark(250,205,96),main(250,287,27),business(250,333,21),place(250,396,15));
      break;
    case 'personal':
      shape='Round';add(ring(208,4,ink,{dash:'dotted'}),ring(159,2,ink),
        mark(250,195,82),business(250,281,27),main(250,328,20),place(250,376,17));
      break;
    case 'office':
      widthMm=58;heightMm=25;shape='Rectangle';
      add(rect(450,254,8,ink,{rx:4}),line(40,184,460,184,2,ink),
        text('DOCUMENT CONTROL',250,156,18,ink,{weight:800}),
        main(250,252,52),line(40,296,460,296,2,ink),
        business(250,326,18),place(250,354,14));
      break;
    case 'date':
      widthMm=56;heightMm=25;shape='Date';
      add(rect(447,252,5,ink),line(31,184,469,184,3,ink),line(31,309,469,309,3,ink),
        mark(90,245,70),line(149,191,149,300,3,ink),
        main(307,223,31),text('____ / ____ / ______',307,272,28,ink),
        business(250,349,17),place(250,355,13));
      break;
    case 'logistics':
      widthMm=58;heightMm=27;shape='Rectangle';
      add(rect(454,290,5,ink,{dash:'dashed'}),line(52,180,448,180,4,ink),
        mark(105,255,87),main(309,225,32),business(309,274,22),
        line(178,304,431,304,2,ink),place(309,335,16));
      break;
    case 'quality':
      shape='Round';add(ring(209,7,ink),ring(167,3,ink),mark(250,224,115),
        arc('QUALITY & INSPECTION',188,-145,110,24,ink),
        main(250,331,27),arc(location.toUpperCase(),188,35,110,20,ink,{role:'address',direction:'reverse'}),
        business(250,381,18));
      break;
    case 'construction':
      widthMm=57;heightMm=34;shape='Rectangle';
      add(rect(456,313,6,ink,{rx:9}),mark(250,201,122),
        line(70,285,430,285,4,ink),main(250,335,29),
        business(250,388,23),place(250,395,16));
      break;
    case 'ngo':
      shape='Double ring';add(ring(212,6,ink),ring(172,2,ink),
        arc('COMMUNITY • CARE • ACTION',191,-145,110,22,ink),
        mark(250,225,108),business(250,320,23),main(250,362,19),
        arc(location.toUpperCase(),191,35,110,19,ink,{role:'address',direction:'reverse'}));
      break;
    case 'community':
      widthMm=55;heightMm=34;shape='Oval';
      add(ellipse(215,170,6,ink),ellipse(187,144,2,ink),
        mark(250,206,92),main(250,282,28),business(250,327,23),
        place(250,375,17));break;
    case 'hospitality':
      widthMm=55;heightMm=32;shape='Oval';
      add(ellipse(217,159,7,ink),ellipse(188,129,3,ink),
        mark(250,185,82),business(250,252,26),
        line(136,292,364,292,2,ink),main(250,328,25),place(250,369,15));
      break;
    case 'retail':
      widthMm=56;heightMm=27;shape='Rectangle';
      add(rect(450,289,5,ink,{rx:7}),line(35,179,465,179,4,ink),
        mark(93,237,81),main(302,232,40),business(302,290,22),
        line(178,310,422,310,2,ink),place(302,346,16));break;
    case 'creative':
      shape='Round';add(ring(209,3,ink,{dash:'dotted'}),ring(185,5,ink),
        mark(250,197,105),business(250,295,28),
        main(250,341,21),place(250,393,16));
      break;
    case 'digital':
      widthMm=59;heightMm=26;shape='Text only';
      add(line(60,164,440,164,3,ink),line(60,344,440,344,3,ink),
        mark(102,257,87),main(300,234,31),
        business(300,285,20),place(300,320,15),
        text('INTERNAL DOCUMENT SAMPLE',250,386,16,ink,{spacing:1}));
      break;
    default:
      add(ring(205,5,ink),mark(250,220,98),business(250,309,23),
        main(250,360,23),place(250,399,17));break;
  }
  if(regulated)items=items.filter(e=>e.type!=='image'); // no insignia-like motifs
  // A profession-specific status heading remains editable in all variants.
  const viewBox=designBounds(items);
  heightMm=Math.round(Math.max(16,Math.min(65,widthMm*viewBox[3]/viewBox[2])));
  return {items,widthMm,heightMm,viewBox,shape,regulated,ink,layout:(layouts[cat]||layouts.company)[variant],purpose:(
    ['company','ngo','logistics','retail','hospitality','construction'].includes(cat)?'Business':
    ['government','office','date','banking'].includes(cat)?'Administrative':
    ['personal','community','creative'].includes(cat)?'Personal':
    cat==='digital'?'Document status':'Professional'
  )};
}

export function makeCountryStampDesign(country,category,subcategory,variant=0){
  const design=buildDesign(country,category,subcategory,variant);
  const safeSub=norm(subcategory,75),key=(country.id+'-'+category.id+'-'+safeSub).toLowerCase().replace(/[^a-z0-9]+/g,'-');
  return {
    id:key+'-'+variant,
    name:safeSub+' — '+design.layout,
    country:country.id,countryName:country.name,
    category:category.id,categoryName:category.name,subcategory:safeSub,
    variant,
    shape:design.shape,
    kind:design.shape,
    color:design.ink,
    purpose:design.purpose,
    languages:country.languages,
    regulated:design.regulated,
    layout:design.layout,
    dimensions:design.widthMm+' × '+design.heightMm+' mm',
    project:{items:design.items,widthMm:design.widthMm,heightMm:design.heightMm,viewBox:design.viewBox},
    sample:{label:safeSub+' — '+design.layout,kind:design.shape,name:'SAMPLE BUSINESS',address:country.location,center:safeSub,color:design.ink},
    defaultFont:'Arial'
  };
}
export function countryStampThumbnail(template){
  return renderStampPreview(template.project,{transparent:true});
}
export const COUNTRY_DESIGN_LAYOUTS=layouts;
