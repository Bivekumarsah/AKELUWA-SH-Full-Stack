// The desktop links remain a normal nav; this controller only manages their phone layout.
export function initMobileToolNavigation(doc=document) {
  const header=doc.querySelector('.app > header');
  const toggle=doc.querySelector('[data-mobile-tools-toggle]');
  const nav=doc.getElementById('mobile-tools-menu');
  if (!header || !toggle || !nav) return;
  const setOpen = open => {
    header.dataset.mobileOpen=String(open);
    toggle.setAttribute('aria-expanded',String(open));
    toggle.setAttribute('aria-label',open?'Close tools menu':'Open tools menu');
    toggle.querySelector('[data-mobile-menu-text]').textContent=open?'Close':'Tools';
  };
  toggle.addEventListener('click',()=>setOpen(header.dataset.mobileOpen!=='true'));
  nav.addEventListener('click',event=>{
    if(event.target.closest('a'))setOpen(false);
  });
  doc.addEventListener('pointerdown',event=>{
    if(header.dataset.mobileOpen==='true'&&!header.contains(event.target))setOpen(false);
  });
  doc.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&header.dataset.mobileOpen==='true'){
      setOpen(false);toggle.focus();
    }
  });
  const media=window.matchMedia('(max-width:700px)');
  media.addEventListener?.('change',event=>{if(!event.matches)setOpen(false)});
  setOpen(false);
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>initMobileToolNavigation(),{once:true});
 else initMobileToolNavigation();
}
