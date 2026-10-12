// Lightweight visual/settings previews for the core photo, PDF and converter tools.
// Heavy PDF/image processing still happens only when the customer requests it.
export function initCoreLivePreviews(doc=document) {
  const get=id=>doc.getElementById(id);
  const panels=[
    ['reducerTool','reducer-heading','PDF preview'],['photoTool','reducer-heading','Photo preview'],
    ['pdf-to-image','h2','PDF to images'],['image-to-pdf','h2','Images to PDF'],
    ['image-converter','h2','Image conversion'],['merge-pdfs','h2','Merge PDFs'],
    ['extract-pages','h2','Extract pages']
  ];
  const created=[];
  for(const [id,anchor,title] of panels){
    const root=get(id),label=root?.querySelector(anchor);if(!root||!label)continue;
    const card=doc.createElement('div');card.className='core-live-panel';card.dataset.coreLive=id;
    card.innerHTML='<strong>'+title+' · live settings</strong><div class="core-live-content"><canvas width="80" height="90" hidden aria-label="Photo settings sample"></canvas><p></p></div>';
    label.after(card);created.push({id,root,card,text:card.querySelector('p'),canvas:card.querySelector('canvas')});
  }
  const value=(id,defaultValue='')=>get(id)?.value||defaultValue;
  const files=id=>[...(get(id)?.files||[])];
  const fileLabel=id=>{const f=files(id);return f.length?f.length+' file(s) selected':'Choose your files'};
  let pending=false;
  function render(){
    pending=false;
    for(const c of created){
      let message='';
      if(c.id==='reducerTool'){
        const mode=get('reducePreserve')?.checked?'Preserve selectable text':'Visual compression';
        message=fileLabel('reduceInput')+' · target '+value('reduceTarget','50')+'% · '+mode+'. First-page preview is below. Exact output size appears after Compress PDF.';
      } else if(c.id==='photoTool'){
        message='Max width '+value('photoWidth','1600')+'px · '+value('photoFormat','image/jpeg').split('/')[1].toUpperCase()+' · target '+value('photoTarget','none')+' KB · quality '+value('photoQuality','85')+'%. This is a visual sample, not the compressed result.';
        const src=get('photoOriginal');
        if(src?.complete&&src.naturalWidth){
          const maxWidth=Math.min(src.naturalWidth,Math.max(1,Number(value('photoWidth','1600'))));
          const cw=Math.max(1,Math.round(maxWidth/Math.max(src.naturalWidth,src.naturalHeight)*110)),ch=Math.max(1,Math.round(cw*src.naturalHeight/src.naturalWidth));
          c.canvas.width=cw;c.canvas.height=ch;
          c.canvas.getContext('2d')?.drawImage(src,0,0,cw,ch);
          c.canvas.hidden=false;
        }else c.canvas.hidden=true;
      } else if(c.id==='pdf-to-image'){
        message=fileLabel('pdfConvertInput')+' · '+value('pdfImagePages','all')+' pages · width '+value('pdfImageWidth','1600')+'px. Generated PNGs are available only after processing.';
      } else if(c.id==='image-to-pdf'){
        message=fileLabel('imagePdfInput')+' · '+value('imagePdfSize','original')+' paper size · '+value('imagePdfFit','contain')+' image fit. Check the downloaded document.';
      } else if(c.id==='image-converter'){
        message=fileLabel('imageConvertInput')+' · image format and settings are applied after conversion.';
      } else if(c.id==='merge-pdfs'){
        message=fileLabel('mergePdfInput')+' · check the selected file order before merging.';
      } else if(c.id==='extract-pages'){
        message=fileLabel('extractPdfInput')+' · select your pages, then review the extracted PDF.';
      }
      c.text.textContent=message;
    }
  }
  const schedule=()=>{if(!pending){pending=true;requestAnimationFrame(render);}};
  const ids=['reduceInput','reduceTarget','reducePreserve','reduceVisual','photoInput','photoWidth','photoFormat','photoTarget','photoQuality','pdfConvertInput','pdfImagePages','pdfImageWidth','imagePdfInput','imagePdfSize','imagePdfFit','imageConvertInput','mergePdfInput','extractPdfInput'];
  ids.forEach(id=>{get(id)?.addEventListener('input',schedule);get(id)?.addEventListener('change',schedule);});
  doc.querySelectorAll('[data-reduction],[data-photo-target]').forEach(el=>el.addEventListener('click',()=>queueMicrotask(schedule)));
  get('photoOriginal')?.addEventListener('load',schedule);
  render();
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>initCoreLivePreviews(),{once:true});
 else initCoreLivePreviews();
}
