// Mobile-first, low-resolution previews. File operations only occur on user submit.
export function initExtraLivePreviews(doc = document) {
  const slug=doc.body?.dataset.extraTool,form=doc.querySelector('.extra-form');
  if(!slug||!form||doc.getElementById('extraLivePanel'))return;
  const panel=doc.createElement('section');
  panel.id='extraLivePanel';panel.className='extra-live-panel';
  panel.setAttribute('aria-label','Live settings preview');
  panel.innerHTML='<div class="extra-live-heading"><strong>Live preview</strong><small>Check your options before downloading</small></div><div class="extra-live-body"><div id="extraLiveVisual" class="extra-live-visual"></div><p id="extraLiveSummary"></p></div>';
  form.before(panel);
  const get=id=>doc.getElementById(id),visual=get('extraLiveVisual'),summary=get('extraLiveSummary');
  const number=(id,fallback)=>Math.max(1,Number(get(id)?.value)||fallback);
  let previousFile=null,image=null,sourceUrl=null,serial=0,queued=false;
  const clearImage=()=>{if(sourceUrl)URL.revokeObjectURL(sourceUrl);sourceUrl=null;image=null;previousFile=null;};
  function imageSample(id,asPhoto) {
    const file=get(id)?.files?.[0];
    if(!file){if(previousFile)clearImage();visual.replaceChildren();summary.textContent='Choose an image to see a low-resolution preview of the selected settings.';return;}
    if(file!==previousFile){
      clearImage();previousFile=file;serial++;
      const thisSerial=serial,src=URL.createObjectURL(file);sourceUrl=src;
      const img=new Image();
      img.onload=()=>{if(serial===thisSerial){image=img;queue();}};
      img.onerror=()=>{summary.textContent='This file cannot be previewed. Try JPG, PNG or WebP.';};
      img.src=src;
    }
    if(!image){summary.textContent='Loading image preview locally…';return;}
    const w=asPhoto?number('resizeWidth',300):number('maxSide',1200);
    const h=asPhoto?number('resizeHeight',400):Math.max(1,Math.round(w*image.naturalHeight/image.naturalWidth));
    const scale=Math.min(1,230/Math.max(w,h)),cw=Math.max(1,Math.round(w*scale)),ch=Math.max(1,Math.round(h*scale));
    let canvas=visual.querySelector('canvas');
    if(!canvas){canvas=doc.createElement('canvas');visual.replaceChildren(canvas);}
    canvas.width=cw;canvas.height=ch;
    const ctx=canvas.getContext('2d');if(!ctx)return;
    ctx.fillStyle='#fff';ctx.fillRect(0,0,cw,ch);
    const fit=asPhoto?(get('fitMode')?.value||'cover'):'contain';
    const ratio=fit==='cover'?Math.max(cw/image.naturalWidth,ch/image.naturalHeight):Math.min(cw/image.naturalWidth,ch/image.naturalHeight);
    const dw=image.naturalWidth*ratio,dh=image.naturalHeight*ratio;
    ctx.drawImage(image,(cw-dw)/2,(ch-dh)/2,dw,dh);
    summary.textContent=asPhoto?
      (w+' × '+h+' px · '+fit+' · target '+number('resizeKB',100)+' KB. Exact output size is available after processing.'):
      ('Image will be resized to max '+w+' px and converted to '+(get('outputFormat')?.value||'jpeg').toUpperCase()+'. Actual output is available after processing.');
  }
  function sheet(type) {
    const paper=doc.createElement('div');paper.className='extra-live-sheet';
    const mark=doc.createElement('span');mark.className='extra-live-mark';
    paper.append(mark);visual.replaceChildren(paper);
    if(type==='numbers'){
      const pos=get('pagePosition')?.value||'bottom-center';
      const start=Math.min(9999,number('pageStart',1));
      mark.textContent=get('pagePattern')?.value==='page-of'?'Page '+start+' of N':String(start);
      mark.style.top=pos.startsWith('top')?'10px':'auto';mark.style.bottom=pos.startsWith('bottom')?'10px':'auto';
      mark.style.left=pos.endsWith('left')?'10px':pos.endsWith('right')?'auto':'50%';
      mark.style.right=pos.endsWith('right')?'10px':'auto';
      mark.style.transform=pos.endsWith('center')?'translateX(-50%)':'none';
      mark.style.fontSize=Math.min(22,Math.max(10,number('pageFontSize',12)))+'px';
      summary.textContent='Illustrative page-number placement. Select Add numbers to process the actual PDF.';
    }else{
      const sign=get('annotationType')?.value!=='watermark',pad=get('signaturePad');
      if(sign&&pad){
        const img=doc.createElement('img');img.alt='Current signature drawing';img.src=pad.toDataURL('image/png');
        mark.append(img);mark.classList.add('extra-live-signature');
      }else{
        mark.textContent=(get('watermarkText')?.value||'SAMPLE').slice(0,80);mark.classList.add('extra-live-watermark');
      }
      mark.style.left='12%';mark.style.top=sign?'70%':'46%';
      summary.textContent='Illustrative '+(sign?'signature':'watermark')+' placement. Final appearance depends on the original PDF.';
    }
  }
  function render(){
    queued=false;
    const files=[...form.querySelectorAll('input[type="file"]')].flatMap(el=>[...(el.files||[])]);
    const fileInfo=files.length?(files.length+' file(s), '+(files.reduce((n,f)=>n+f.size,0)/1048576).toFixed(1)+' MB. '):'';
    if(slug==='photo-signature-resizer')return imageSample('imageInput',true);
    if(slug==='image-format-converter')return imageSample('formatInput',false);
    if(slug==='pdf-page-numbers')return sheet('numbers');
    if(slug==='pdf-esign-watermark')return sheet('sign');
    visual.replaceChildren();
    if(slug==='qr-code-generator')summary.textContent='QR code updates below as you type. Scan it before relying on the result.';
    else if(slug==='unicode-preeti')summary.textContent='Converted text updates below as you type. Proofread Nepali spelling and complex letter combinations.';
    else if(slug==='resume-builder')summary.textContent='Your resume preview updates immediately below the form.';
    else if(slug==='bulk-image-compressor')summary.textContent=fileInfo+'Output: ZIP. Max image side '+(get('bulkMax')?.value||'1280')+'px; target '+(get('bulkKB')?.value||'200')+' KB. Process to see real results.';
    else if(slug==='ocr-text-extractor')summary.textContent=fileInfo+'OCR starts when requested, not on every keystroke. Recognized text appears below.';
    else if(slug==='pdf-to-word')summary.textContent=fileInfo+'Text extraction starts when requested. Complex PDF layouts require verification.';
    else summary.textContent=fileInfo+'Check settings, then process the file for a final result.';
  }
  const queue=()=>{if(!queued){queued=true;requestAnimationFrame(render);}};
  form.addEventListener('input',queue);
  form.addEventListener('change',()=>queueMicrotask(queue));
  if(slug==='pdf-esign-watermark'){
    get('signaturePad')?.addEventListener('pointerup',queue);
    get('signaturePad')?.addEventListener('pointercancel',queue);
    get('clearSignature')?.addEventListener('click',()=>queueMicrotask(queue));
  }
  form.addEventListener('focusin',e=>{if(e.target.matches?.('input:not([type=checkbox]),textarea,select'))panel.classList.add('extra-live-typing');});
  form.addEventListener('focusout',()=>requestAnimationFrame(()=>{if(!form.contains(doc.activeElement))panel.classList.remove('extra-live-typing');}));
  window.addEventListener('pagehide',clearImage,{once:true});
  render();
}
if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>initExtraLivePreviews(),{once:true});
  else initExtraLivePreviews();
}
