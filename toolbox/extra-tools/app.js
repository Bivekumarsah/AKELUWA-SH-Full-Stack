/* AKELUWA Toolbox: free client-side extended tools. No document upload endpoints. */
(() => {
  "use strict";
  const byId = id => document.getElementById(id);
  const tool = document.body.dataset.extraTool;
  if (!tool) return;
  const status = byId("toolStatus");
  const output = byId("toolOutput");
  function say(message, error = false) {
    if (!status) return;
    status.textContent = message;
    status.classList.toggle("is-error", Boolean(error));
    status.hidden = false;
  }
  function requireFile(inputId, maxMB = 30) {
    const file = byId(inputId)?.files?.[0];
    if (!file) throw new Error("Please choose a file first.");
    if (file.size > maxMB * 1024 * 1024) throw new Error("File exceeds the " + maxMB + " MB safety limit.");
    return file;
  }
  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  function safeName(name) { return String(name).replace(/\.[^.]*$/, "").replace(/[^a-z0-9-]+/gi,"-").slice(0,70) || "download"; }
  function escapeHTML(v) { return String(v).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch])); }
  function number(id, low, high) {
    const v = Number(byId(id).value);
    if (!Number.isFinite(v) || v < low || v > high) throw new Error("Enter " + id + " between " + low + " and " + high + ".");
    return v;
  }
  function onSubmit(id, callback) {
    byId(id)?.addEventListener("submit", async e => {
      e.preventDefault();
      const button = e.currentTarget.querySelector('button[type="submit"]');
      if (button) button.disabled = true;
      say("Processing on your device…");
      try { await callback(); } catch(error) { console.error("Tool failed:", error); say(error.message || "Processing failed. Try a smaller file.", true); }
      finally { if (button) button.disabled = false; }
    });
  }
  async function openImage(file) {
    if (file.size > 25*1024*1024) throw new Error("Maximum image size is 25 MB.");
    if (!/^image\/(jpeg|png|webp|gif|bmp|avif|heic|heif)$/i.test(file.type) && !/\.(jpe?g|png|webp|gif|bmp|avif|heic|heif)$/i.test(file.name)) throw new Error("Choose a supported image file.");
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.decoding = "async";
      image.src = url;
      await image.decode();
      if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 28000000) throw new Error("Image dimensions exceed the 28-megapixel limit.");
      return image;
    } catch {
      throw new Error("Your browser cannot decode this image. HEIC files may require conversion on a compatible device.");
    } finally {
      // Blob URLs are released after the browser has decoded pixels.
      URL.revokeObjectURL(url);
    }
  }
  function canvasSize(w,h) {
    if (w < 1 || h < 1 || w*h > 28000000) throw new Error("Output dimensions must be below 28 megapixels.");
    const c=document.createElement("canvas");c.width=Math.round(w);c.height=Math.round(h);return c;
  }
  function drawImageTo(image, width, height, mode = "contain", bg = "#ffffff") {
    const canvas = canvasSize(width,height);
    const ctx=canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is unavailable on this device.");
    if (bg !== "transparent") {ctx.fillStyle=bg;ctx.fillRect(0,0,canvas.width,canvas.height);}
    const iw=image.naturalWidth, ih=image.naturalHeight;
    const scale = mode==="cover" ? Math.max(width/iw,height/ih) : Math.min(width/iw,height/ih);
    const dw=iw*scale, dh=ih*scale;
    ctx.drawImage(image,(width-dw)/2,(height-dh)/2,dw,dh);
    return canvas;
  }
  const mimeFor = format => ({jpeg:"image/jpeg",png:"image/png",webp:"image/webp"})[format] || "image/jpeg";
  function asBlob(canvas,mime,quality) {
    return new Promise((resolve,reject)=>canvas.toBlob(b=>b && b.type===mime ? resolve(b) : reject(new Error("This browser cannot export "+mime+". Try JPEG or PNG.")),mime,quality));
  }
  async function sizeTarget(canvas, mime, targetKB) {
    if(mime === "image/png" || !targetKB) { const blob=await asBlob(canvas,mime,0.92);return {blob,targetMet:!targetKB || blob.size<=targetKB*1024}; }
    let lo=0.08,hi=0.96,best=null;
    for(let i=0;i<10;i++){
      const q=(lo+hi)/2,blob=await asBlob(canvas,mime,q);
      if(blob.size<=targetKB*1024){best=blob;lo=q;}else{hi=q;}
    }
    if (!best) {best=await asBlob(canvas,mime,0.08);return {blob:best,targetMet:false};}
    return {blob:best,targetMet:true};
  }
  function preview(blob) {
    const img=byId("imagePreview");
    if(!img)return;
    if(img.dataset.objectUrl)URL.revokeObjectURL(img.dataset.objectUrl);
    const url=URL.createObjectURL(blob);
    img.src=url;img.dataset.objectUrl=url;img.hidden=false;
  }
  function bytes(n) {return (n/1024).toFixed(1)+" KB";}
  function ensurePDFLib() {
    if(!window.PDFLib) throw new Error("The bundled PDF library could not load. Refresh the page.");
    return window.PDFLib;
  }
  function ensurePdfjs() {
    const lib=window.pdfjsLib;
    if(!lib) throw new Error("The bundled PDF reader could not load. Refresh the page.");
    lib.GlobalWorkerOptions.workerSrc=new URL("../../assets/vendor/pdfjs/pdf.worker.min.js",window.location.href).href;
    return lib;
  }
  function xml(s) {return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&quot;"}[c]));}
  // Store-only ZIP writer for modest DOCX files and bulk images: no external ZIP CDN.
  const te=new TextEncoder();
  const crcTable=Array.from({length:256},(_,i)=>{let c=i;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;return c>>>0;});
  function crc32(bytes) {let c=0xFFFFFFFF;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0;}
  function little(n,len) {const b=new Uint8Array(len);for(let i=0;i<len;i++)b[i]=(n>>>8*i)&255;return b;}
  function concat(parts){let length=parts.reduce((n,x)=>n+x.length,0),out=new Uint8Array(length),off=0;for(const p of parts){out.set(p,off);off+=p.length;}return out;}
  async function zipFiles(files){
    const parts=[],central=[];let offset=0;
    for(const entry of files){
      const name=te.encode(entry.name),content=typeof entry.data==="string"?te.encode(entry.data):new Uint8Array(await entry.data.arrayBuffer?.() || entry.data);
      if(name.length>65535 || content.length>100000000)throw new Error("Export too large.");
      const crc=crc32(content);
      const common=concat([little(0,2),little(0,2),little(crc,4),little(content.length,4),little(content.length,4),little(name.length,2)]);
      const local=concat([little(0x04034b50,4),little(20,2),little(0,2),little(0,2),common,little(0,2),name,content]);
      const dir=concat([little(0x02014b50,4),little(20,2),little(20,2),little(0,2),little(0,2),common,little(0,2),little(0,2),little(0,2),little(0,2),little(0,4),little(offset,4),name]);
      parts.push(local);central.push(dir);offset+=local.length;
    }
    const body=concat(parts),directory=concat(central);
    const end=concat([little(0x06054b50,4),little(0,2),little(0,2),little(files.length,2),little(files.length,2),little(directory.length,4),little(body.length,4),little(0,2)]);
    return new Blob([body,directory,end],{type:"application/zip"});
  }
  function photoTool(){
    const type=byId("photoMode");
    function defaults(){if(type.value==="signature"){byId("resizeWidth").value="300";byId("resizeHeight").value="100";byId("fitMode").value="contain";byId("resizeKB").value="30";}else{byId("resizeWidth").value="300";byId("resizeHeight").value="400";byId("fitMode").value="cover";byId("resizeKB").value="100";}}
    type.addEventListener("change",defaults);
    onSubmit("photoResizeForm",async()=>{
      const file=requireFile("imageInput"),image=await openImage(file),w=number("resizeWidth",20,5000),h=number("resizeHeight",20,5000),target=number("resizeKB",1,25000);
      const format=byId("resizeFormat").value,mime=mimeFor(format);
      const canvas=drawImageTo(image,w,h,byId("fitMode").value);
      const processed=await sizeTarget(canvas,mime,target);
      preview(processed.blob);
      download(processed.blob,safeName(file.name)+"-"+w+"x"+h+"."+({jpeg:"jpg",png:"png",webp:"webp"})[format]);
      say("Downloaded "+w+" × "+h+" "+format.toUpperCase()+" — "+bytes(processed.blob.size)+". "+(processed.targetMet?"Target reached.":"Target could not be met at the requested dimensions. PNG uses lossless compression.")); 
    });
  }
  async function pdfText(file){
    if(file.type!=="application/pdf" && !/\.pdf$/i.test(file.name))throw new Error("Select a PDF file.");
    const pdfjs=ensurePdfjs(),data=new Uint8Array(await file.arrayBuffer());
    const pdf=await pdfjs.getDocument({data}).promise;
    try{
      if(pdf.numPages>75)throw new Error("Maximum 75 PDF pages per conversion.");
      const results=[];
      for(let pageNo=1;pageNo<=pdf.numPages;pageNo++){
        const page=await pdf.getPage(pageNo),text=await page.getTextContent();
        let line="",lastY=null,rows=[];
        for(const item of text.items){
          if(!item.str)continue;
          const y=item.transform?.[5];
          if(lastY!==null && typeof y==="number" && Math.abs(lastY-y)>3){if(line.trim())rows.push(line.trim());line="";}
          line+=item.str+(item.hasEOL?"\n":" ");
          lastY=typeof y==="number"?y:lastY;
          if(item.hasEOL){rows.push(line.trim());line="";}
        }
        if(line.trim())rows.push(line.trim());
        results.push(rows);
      }
      return results;
    }finally{await pdf.destroy();}
  }
  function docxXML(pages) {
    const content=pages.map((lines,i)=>lines.map(line=>'<w:p><w:r><w:t xml:space="preserve">'+xml(line)+'</w:t></w:r></w:p>').join("")+(i<pages.length-1?'<w:p><w:r><w:br w:type="page"/></w:r></w:p>':"")).join("");
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+content+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:bottom="1440" w:left="1440" w:right="1440"/></w:sectPr></w:body></w:document>';
  }
  function pdfWordTool(){
    onSubmit("pdfWordForm",async()=>{
      const file=requireFile("pdfWordInput",35),pages=await pdfText(file);
      if(!pages.some(p=>p.some(Boolean)))throw new Error("No selectable text found. This PDF may be scanned; run OCR first.");
      const zip=await zipFiles([
        {name:"[Content_Types].xml",data:'<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'},
        {name:"_rels/.rels",data:'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'},
        {name:"word/document.xml",data:docxXML(pages)}
      ]);
      download(new Blob([zip],{type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"}),safeName(file.name)+".docx");
      say("Editable text exported from "+pages.length+" PDF pages. Formatting, complex tables and images are not preserved; check the result in Word.");
    });
  }
  function signatureTool(){
    const c=byId("signaturePad"),ctx=c.getContext("2d");let drawing=false,hasInk=false;
    function point(e){const r=c.getBoundingClientRect();return {x:(e.clientX-r.left)*c.width/r.width,y:(e.clientY-r.top)*c.height/r.height};}
    c.addEventListener("pointerdown",e=>{drawing=true;c.setPointerCapture(e.pointerId);const p=point(e);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineCap="round";ctx.lineJoin="round";ctx.strokeStyle="#183c6b";ctx.lineWidth=3;ctx.lineTo(p.x+0.1,p.y+0.1);ctx.stroke();hasInk=true;});
    c.addEventListener("pointermove",e=>{if(!drawing)return;const p=point(e);ctx.lineTo(p.x,p.y);ctx.stroke();});
    c.addEventListener("pointerup",()=>drawing=false);c.addEventListener("pointercancel",()=>drawing=false);
    byId("clearSignature").addEventListener("click",()=>{ctx.clearRect(0,0,c.width,c.height);hasInk=false;say("Signature pad cleared.");});
    onSubmit("signForm",async()=>{
      const file=requireFile("signPdf",50),{PDFDocument,rgb,degrees,StandardFonts}=ensurePDFLib();
      const doc=await PDFDocument.load(await file.arrayBuffer(),{updateMetadata:false});
      const type=byId("annotationType").value,pages=doc.getPages();
      if(pages.length>200)throw new Error("Maximum 200 pages.");
      const selected=byId("applyPages").value==="all"?pages:[pages[0]];
      if(type==="signature"&&!hasInk)throw new Error("Draw your signature in the pad first.");
      const image=type==="signature"?await doc.embedPng(c.toDataURL("image/png")):null;
      let font=null;
      if(type==="watermark"){font=await doc.embedFont(StandardFonts.Helvetica);if(!/^[\x20-\x7e]{1,80}$/.test(byId("watermarkText").value.trim()))throw new Error("Enter 1–80 basic Latin characters for this PDF watermark font.");}
      for(const page of selected){
        const {width,height}=page.getSize();
        if(type==="signature"){const iw=Math.min(width*0.36,190),ih=iw*image.height/image.width;page.drawImage(image,{x:Math.max(10,width-iw-32),y:Math.max(12,35),width:iw,height:ih});}
        else{const text=byId("watermarkText").value.trim(),size=Math.min(52,width/Math.max(7,text.length*0.54));page.drawText(text,{x:width*0.12,y:height*0.5,size,rotate:degrees(28),opacity:0.22,font,color:rgb(0.23,0.38,0.53)});}
      }
      download(new Blob([await doc.save()],{type:"application/pdf"}),safeName(file.name)+"-"+(type==="signature"?"signed":"watermarked")+".pdf");
      say("PDF exported. This is a visible mark only, not a cryptographic digital signature; modifying a previously signed PDF may invalidate its signature.");
    });
    byId("annotationType").addEventListener("change",()=>{byId("signatureControls").hidden=byId("annotationType").value!=="signature";byId("watermarkControls").hidden=byId("annotationType").value!=="watermark";});
  }
  function inject(url,globalName){
    if(window[globalName])return Promise.resolve(window[globalName]);
    return new Promise((resolve,reject)=>{const s=document.createElement("script");s.src=url;s.onload=()=>window[globalName]?resolve(window[globalName]):reject(new Error("OCR library did not initialize."));s.onerror=()=>reject(new Error("Could not load the OCR engine. Check your internet connection."));document.head.append(s);});
  }
  async function pdfOCRCanvases(file){
    const reader=ensurePdfjs(),pdf=await reader.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
    if(pdf.numPages>5){await pdf.destroy();throw new Error("OCR can process up to five PDF pages per session.");}
    const list=[];
    try{for(let i=1;i<=pdf.numPages;i++){const pg=await pdf.getPage(i),vp=pg.getViewport({scale:1.6});if(vp.width*vp.height>15000000)throw new Error("PDF page is too large to OCR.");const c=canvasSize(vp.width,vp.height);await pg.render({canvasContext:c.getContext("2d"),viewport:vp}).promise;list.push(c);}}finally{await pdf.destroy();}
    return list;
  }
  function ocrTool(){
    onSubmit("ocrForm",async()=>{
      const file=requireFile("ocrInput",25),lang=byId("ocrLang").value;
      const engine=await inject("https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js","Tesseract");
      const sources=/\.pdf$/i.test(file.name)||file.type==="application/pdf" ? await pdfOCRCanvases(file) : await (async()=>{const img=await openImage(file);return [drawImageTo(img,img.naturalWidth,img.naturalHeight,"contain","transparent")];})();
      const texts=[];
      for(let i=0;i<sources.length;i++){
        say("Recognizing text — page "+(i+1)+" of "+sources.length+". Language data may take time to download…");
        const result=await engine.recognize(sources[i],lang);
        texts.push(result.data?.text||"");
      }
      const result=texts.join("\n\n--- Page break ---\n\n").trim();
      if(!result)throw new Error("No text was recognized. Try a clearer scan.");
      byId("ocrResult").value=result;
      download(new Blob([result],{type:"text/plain;charset=utf-8"}),safeName(file.name)+"-ocr.txt");
      say("OCR complete. Review names and numbers carefully; recognition errors are possible.");
    });
    byId("copyOCR").addEventListener("click",async()=>{if(!byId("ocrResult").value)return;say("Copying recognized text…");await navigator.clipboard.writeText(byId("ocrResult").value);say("Text copied.");});
  }
  const PREETI_TO_UNICODE = {
    "k|":"प्र","q":"त्र","I":"क्ष","1":"ज्ञ","cf}":"औ","cf]":"ओ","cf":"आ","c":"अ",
    "O{":"ई","O":"इ","pm":"ऊ","p":"उ","P]":"ऐ","P":"ए",
    "s":"क","v":"ख","u":"ग","3":"घ","r":"च","5":"छ","h":"ज","em":"झ",
    "6":"ट","7":"ठ","8":"ड","9":"ढ","0":"ण","t":"त","y":"थ","b":"द","w":"ध",
    "g":"न","k":"प","km":"फ","a":"ब","e":"भ","d":"म","o":"य","/":"र","n":"ल",
    "j":"व","z":"श","if":"ष",";":"स","x":"ह",
    "f}":"ौ","f]":"ो","f":"ा","L":"ी","l":"ि","]":"े","}":"ै","'":"ु",'"':"ू",
    "+":"ं","M":"ः","\\":"्","=":".","?":"।"
  };
  const preetiPairs=Object.entries(PREETI_TO_UNICODE).sort((a,b)=>b[0].length-a[0].length);
  const reversePairs=Object.entries(PREETI_TO_UNICODE).sort((a,b)=>b[1].length-a[1].length);
  function basicConvert(input,pairs){
    let result="";
    for(let i=0;i<input.length;){
      const pair=pairs.find(([a])=>input.startsWith(a,i));
      if(pair){result+=pair[1];i+=pair[0].length;}else{result+=input[i++];}
    }
    // Reverse legacy glyphs are not a complete font shaping engine.
    return result;
  }
  function unicodePreetiTool(){
    const updateText=()=>{
      const input=byId("fontInput").value;
      if(input.length>25000||!input.trim()){byId("fontResult").value="";return;}
      const pairs=byId("fontDirection").value==="toUnicode"?preetiPairs:reversePairs.map(([legacy,unicode])=>[unicode,legacy]);
      byId("fontResult").value=basicConvert(input,pairs);
    };
    byId("fontInput").addEventListener("input",updateText);
    byId("fontDirection").addEventListener("change",updateText);
    onSubmit("fontForm",async()=>{
      const input=byId("fontInput").value;
      if(input.length>25000)throw new Error("Maximum 25,000 characters.");
      if(!input.trim())throw new Error("Enter text to convert.");
      const direction=byId("fontDirection").value;
      const pairs=direction==="toUnicode"?preetiPairs:reversePairs.map(([legacy,unicode])=>[unicode,legacy]);
      byId("fontResult").value=basicConvert(input,pairs);
      say("Basic glyph mapping converted. Proofread Nepali text: conjuncts, reordering and legacy-font variations may need manual correction.");
    });
    byId("copyFont").addEventListener("click",async()=>{await navigator.clipboard.writeText(byId("fontResult").value);say("Text copied.");});
  }
  function resumeTool(){
    function render() {
      const name=byId("cvName").value.trim()||"Your Name",role=byId("cvRole").value.trim(),email=byId("cvEmail").value.trim(),phone=byId("cvPhone").value.trim(),
        summary=byId("cvSummary").value.trim(),experience=byId("cvExperience").value.trim(),education=byId("cvEducation").value.trim(),skills=byId("cvSkills").value.trim();
      function field(title,text){return text?'<section><h2>'+title+'</h2><p>'+escapeHTML(text).replace(/\n/g,"<br>")+'</p></section>':"";}
      const body='<div class="cv-paper '+(byId("cvTemplate").value==="modern"?"cv-modern":"")+'"><h1>'+escapeHTML(name)+'</h1><p class="cv-role">'+escapeHTML(role)+'</p><p class="cv-contacts">'+[email,phone].filter(Boolean).map(escapeHTML).join(" · ")+'</p>'+
        field("Profile",summary)+field("Experience",experience)+field("Education",education)+field("Skills",skills)+'</div>';
      byId("resumePreview").innerHTML=body;
      return body;
    }
    byId("cvForm").addEventListener("input",render);
    byId("cvForm").addEventListener("change",render);
    byId("printCV").addEventListener("click",()=>{render();window.print();});
    byId("downloadCV").addEventListener("click",()=>{
      const html='<!doctype html><html><head><meta charset="utf-8"><title>Resume</title><style>body{font:16px/1.5 Arial,sans-serif;margin:50px auto;max-width:750px;color:#172b42}h1{font-size:32px;margin:0}h2{font-size:17px;border-bottom:1px solid #ddd;margin-top:25px}.cv-role{font-weight:bold}.cv-contacts{font-size:13px;color:#666}.cv-paper p{white-space:pre-line}</style></head><body>'+render()+'</body></html>';
      download(new Blob([html],{type:"text/html;charset=utf-8"}),"resume-"+safeName(byId("cvName").value||"my-cv")+".html");
      say("Editable HTML resume downloaded. Use Print / Save as PDF to export a PDF without a watermark.");
    });
    render();
  }
  function formatTool(){
    onSubmit("formatForm",async()=>{
      const file=requireFile("formatInput"),image=await openImage(file),mime=mimeFor(byId("outputFormat").value);
      const max=number("maxSide",100,7000);
      const factor=Math.min(1,max/Math.max(image.naturalWidth,image.naturalHeight));
      const c=drawImageTo(image,Math.max(1,Math.round(image.naturalWidth*factor)),Math.max(1,Math.round(image.naturalHeight*factor)),"contain",mime==="image/jpeg"?"#ffffff":"transparent");
      const blob=await asBlob(c,mime,0.91);
      preview(blob);
      const ext=byId("outputFormat").value==="jpeg"?"jpg":byId("outputFormat").value;
      download(blob,safeName(file.name)+"-converted."+ext);
      say("Converted image: "+c.width+" × "+c.height+", "+bytes(blob.size)+". Animated images become one static frame.");
    });
  }
  function qrTool(){
    let timer=0,revision=0;
    async function generate(shouldDownload=false){
      const ticket=++revision,data=byId("qrValue").value.trim(),target=byId("qrCanvas");
      if(!data||data.length>500){target.replaceChildren();if(shouldDownload)throw new Error("Enter 1–500 characters for the QR code.");return;}
      const size=number("qrSize",128,1000);
      const QR=await inject("https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js","QRCode");
      if(ticket!==revision)return;
      target.replaceChildren();
      new QR(target,{text:data,width:size,height:size,correctLevel:QR.CorrectLevel.H,colorDark:"#102c48",colorLight:"#ffffff"});
      const canvas=target.querySelector("canvas");if(!canvas)throw new Error("QR canvas was not created.");
      if(shouldDownload){
        download(await asBlob(canvas,"image/png",1),"akeluwatoolbox-qr.png");
        say("QR code generated and downloaded. Scan it on another device before using it.");
      }
    }
    const schedule=()=>{
      clearTimeout(timer);
      timer=setTimeout(()=>generate().catch(()=>say("Preview unavailable; try Generate and download.")),400);
    };
    byId("qrValue").addEventListener("input",schedule);
    byId("qrSize").addEventListener("input",schedule);
    onSubmit("qrForm",async()=>{clearTimeout(timer);await generate(true);});
  }
  function pageNumbersTool(){
    onSubmit("numbersForm",async()=>{
      const file=requireFile("numbersPdf",50),{PDFDocument,StandardFonts,rgb}=ensurePDFLib(),pdf=await PDFDocument.load(await file.arrayBuffer());
      if(pdf.getPageCount()>200)throw new Error("Maximum 200 pages.");
      const font=await pdf.embedFont(StandardFonts.Helvetica),size=number("pageFontSize",8,30),start=number("pageStart",1,9999);
      const position=byId("pagePosition").value, total=pdf.getPageCount();
      for(let i=0;i<total;i++){
        const p=pdf.getPage(i),label=byId("pagePattern").value==="page-of"?"Page "+(start+i)+" of "+(start+total-1):String(start+i);
        const {width,height}=p.getSize(),tw=font.widthOfTextAtSize(label,size);
        const x=position.includes("left")?32:position.includes("right")?Math.max(12,width-tw-32):(width-tw)/2;
        const y=position.startsWith("top")?height-37:24;
        p.drawText(label,{x,y,size,font,color:rgb(0.20,0.26,0.33)});
      }
      download(new Blob([await pdf.save()],{type:"application/pdf"}),safeName(file.name)+"-numbered.pdf");
      say("Page numbering complete for "+total+" pages. A document edit may invalidate existing digital signatures.");
    });
  }
  function bulkTool(){
    onSubmit("bulkForm",async()=>{
      const files=[...byId("bulkInputs").files];
      if(!files.length)throw new Error("Choose at least one image.");
      if(files.length>20)throw new Error("Maximum 20 files per batch.");
      if(files.some(f=>f.size>25*1024*1024))throw new Error("Each image must be 25 MB or smaller.");
      const max=number("bulkMax",128,5000),target=number("bulkKB",5,20000),mime=mimeFor(byId("bulkFormat").value);
      const archives=[],lines=[];
      for(let i=0;i<files.length;i++){
        const f=files[i],image=await openImage(f),scale=Math.min(1,max/Math.max(image.naturalWidth,image.naturalHeight));
        const w=Math.max(1,Math.round(image.naturalWidth*scale)),h=Math.max(1,Math.round(image.naturalHeight*scale));
        const canvas=drawImageTo(image,w,h,"contain",mime==="image/jpeg"?"#ffffff":"transparent"),{blob,targetMet}=await sizeTarget(canvas,mime,target);
        const ext=byId("bulkFormat").value==="jpeg"?"jpg":byId("bulkFormat").value;
        archives.push({name:String(i+1).padStart(2,"0")+"-"+safeName(f.name)+"."+ext,data:blob});
        lines.push(f.name+": "+bytes(f.size)+" → "+bytes(blob.size)+(targetMet?"":" (above target)"));
        say("Compressed "+(i+1)+" / "+files.length+" images…");
      }
      const zip=await zipFiles(archives);
      download(zip,"akeluwatoolbox-compressed-images.zip");
      byId("bulkReport").textContent=lines.join("\n");
      say(files.length+" images processed. ZIP downloaded; inspect clarity and dimensions before using.");
    });
  }
  const tasks={"photo-signature-resizer":photoTool,"pdf-to-word":pdfWordTool,"pdf-esign-watermark":signatureTool,
    "ocr-text-extractor":ocrTool,"unicode-preeti":unicodePreetiTool,"resume-builder":resumeTool,
    "image-format-converter":formatTool,"qr-code-generator":qrTool,"pdf-page-numbers":pageNumbersTool,"bulk-image-compressor":bulkTool};
  if(tasks[tool]) tasks[tool]();
})();
