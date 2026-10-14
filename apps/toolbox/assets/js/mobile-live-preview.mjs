// Compact mobile preview shared by both the basic and advanced stamp editors.
// The preview is an isolated SVG image: duplicate inline SVG IDs cannot
// interfere with the full editor's filters, masks or draggable elements.
export function initMobileStampPreview(doc = document) {
  const root = doc.getElementById('stampTool');
  const heading = root?.querySelector('.stamp-heading');
  const original = root?.querySelector('#stampPreview');
  if (!heading || !original || root.querySelector('[data-stamp-mobile-dock]')) return;
  const dock = doc.createElement('div');
  dock.className = 'stamp-mobile-dock';
  dock.dataset.stampMobileDock = '';
  dock.innerHTML = '<img data-stamp-dock-image alt="Current stamp design preview" />' +
    '<div class="stamp-mobile-dock-label"><strong>Live stamp preview</strong><small>Updates while you edit</small></div>' +
    '<div class="stamp-mobile-dock-actions">' +
    '<button type="button" data-stamp-inline-expand aria-pressed="false" aria-label="Show larger live preview while editing">Bigger preview</button>' +
    '<button type="button" data-stamp-expand aria-label="Expand current stamp preview">Full view ↗</button></div>';
  heading.after(dock);
  const dialog = doc.createElement('dialog');
  dialog.className = 'stamp-mobile-preview-dialog';
  dialog.setAttribute('aria-label', 'Expanded stamp preview');
  dialog.innerHTML = '<div class="stamp-dialog-header"><strong>Current stamp design</strong><button type="button" data-stamp-close>Close ✕</button></div>' +
    '<img data-stamp-dialog-image alt="Current stamp design, enlarged" />' +
    '<p>Close to keep editing. Downloads are available in the stamp editor.</p>';
  root.append(dialog);
  const thumb = dock.querySelector('[data-stamp-dock-image]');
  const full = dialog.querySelector('[data-stamp-dialog-image]');
  // Stamp Studio may mount after this module; connect its preview when it appears.
  let studio = null;
  let studioPreview = null;
  let queued = false;
  let lastSvg = '';
  const observeStudio = () => {
    const current = root.querySelector('[data-ak-studio]');
    if (!current || current === studio) return;
    studio = current;
    studioPreview = studio.querySelector('[data-preview]');
    if (studioPreview) observer.observe(studioPreview, {childList:true,subtree:true,attributes:true,characterData:true});
    observer.observe(studio, {attributes:true,attributeFilter:['hidden']});
  };
  const isStudio = () => Boolean(studio && !studio.hidden);
  const update = () => {
    queued = false;
    observeStudio();
    const svg = (isStudio() ? studioPreview : original)?.querySelector('svg');
    if (!svg) return;
    const source = svg.outerHTML;
    if (source === lastSvg) return;
    lastSvg = source;
    // This is a preview of the exact editor SVG, not a second rendering engine.
    const data = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(source);
    thumb.src = data;
    // Decode the larger image only while the modal is in use on low-memory phones.
    if (dialog.open) full.src = data;
  };
  const schedule = () => {
    if (!queued) { queued = true; requestAnimationFrame(update); }
  };
  const observer = new MutationObserver(schedule);
  observer.observe(original, {childList:true,subtree:true,attributes:true,characterData:true});
  observer.observe(root, {childList:true});
  observeStudio();
  root.addEventListener('click', event => {
    if (event.target.closest('[data-mode]')) schedule();
  });
  // Unlike the dialog, the larger in-page preview remains visible while controls are editable.
  const toggleSize = dock.querySelector('[data-stamp-inline-expand]');
  toggleSize.addEventListener('click', () => {
    const enlarged = dock.classList.toggle('is-enlarged');
    toggleSize.setAttribute('aria-pressed', String(enlarged));
    toggleSize.setAttribute('aria-label', enlarged ? 'Use smaller live preview while editing' : 'Show larger live preview while editing');
    toggleSize.textContent = enlarged ? 'Smaller preview' : 'Bigger preview';
  });
  dock.querySelector('[data-stamp-expand]').addEventListener('click', () => {
    if (typeof dialog.showModal === 'function' && !dialog.open) {
      dialog.showModal();
      // The compact image is already up to date; refresh if a change is queued.
      if (thumb.hasAttribute('src')) full.src = thumb.src;
    }
    schedule();
  });
  // Release the unused enlarged image, including when Escape closes the dialog.
  dialog.addEventListener('close', () => full.removeAttribute('src'));
  const close = () => dialog.close();
  dialog.querySelector('[data-stamp-close]').addEventListener('click', close);
  dialog.addEventListener('click', event => {if(event.target===dialog) close();});
  root.addEventListener('focusin', event => {
    if (event.target.matches?.('input:not([type=checkbox]):not([type=radio]),textarea,select')) {
      root.classList.add('stamp-mobile-typing');
    }
  });
  root.addEventListener('focusout', () => {
    requestAnimationFrame(() => {
      const current = doc.activeElement;
      if (!current?.matches?.('input:not([type=checkbox]):not([type=radio]),textarea,select') || !root.contains(current)) root.classList.remove('stamp-mobile-typing');
    });
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      root.classList.toggle('stamp-mobile-keyboard', window.visualViewport.height < window.innerHeight * .76);
    }, {passive:true});
  }
  schedule();
  return {update:schedule, destroy:() => observer.disconnect()};
}
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => initMobileStampPreview(), {once:true});
  else initMobileStampPreview();
}
