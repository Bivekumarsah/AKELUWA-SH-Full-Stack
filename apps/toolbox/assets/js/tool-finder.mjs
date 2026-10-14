// Find existing real tool links. No tracking, backend search, or dependency.
// Pure matching helpers are exported for lightweight unit testing.
export function categoryForPath(path = '') {
  const p = String(path).toLowerCase();
  if (/(?:digital-stamp-maker|resume-builder)/.test(p)) return 'business';
  if (/(?:unicode-preeti|qr-code-generator)/.test(p)) return 'everyday';
  if (/(?:compress-photo|remove-background|photo-signature-resizer|image-format-converter|bulk-image-compressor)/.test(p)) return 'images';
  return 'documents';
}
const synonymGroups = [
  ['compress', 'reduce', 'shrink', 'smaller', 'size'],
  ['resume', 'cv', 'curriculum'],
  ['photo', 'picture', 'image', 'jpeg', 'jpg'],
  ['stamp', 'seal'],
  ['signature', 'sign', 'esign'],
  ['convert', 'converter', 'conversion'],
];
export const normalizeSearch = text => String(text ?? '').toLowerCase().normalize('NFKC')
  .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
function termMatches(term, haystack) {
  if (haystack.includes(term)) return true;
  const group = synonymGroups.find(words => words.includes(term));
  return Boolean(group?.some(word => haystack.includes(word)));
}
export function matchesTool(item, query = '', category = 'all') {
  if (category !== 'all' && categoryForPath(item.href) !== category) return false;
  const haystack = normalizeSearch([item.title, item.description, item.href].join(' '));
  return normalizeSearch(query).split(/\s+/).filter(Boolean).every(term => termMatches(term, haystack));
}
export function initToolFinder(doc = document) {
  const input = doc.getElementById('toolSearch');
  if (!input) return;
  const cards = [...doc.querySelectorAll('.tool-card, .extra-home-card, .extra-hub-link')];
  const controls = [...doc.querySelectorAll('[data-tool-filter]')];
  const counter = doc.getElementById('toolSearchCount');
  const empty = doc.getElementById('toolSearchEmpty');
  const clear = doc.getElementById('toolSearchClear');
  const all = cards.map(el => ({
    el, href: el.getAttribute('href') || '',
    title: el.querySelector('h3,strong')?.textContent || '',
    description: el.textContent || '',
  }));
  let category = 'all';
  const render = () => {
    let count = 0;
    for (const item of all) {
      const visible = matchesTool(item, input.value, category);
      item.el.hidden = !visible;
      if (visible) count++;
    }
    if (counter) counter.textContent = count === 1 ? '1 matching tool' : count + ' matching tools';
    if (empty) empty.hidden = count !== 0;
    if (clear) clear.hidden = !input.value && category === 'all';
    for (const button of controls) button.setAttribute('aria-pressed', String(button.dataset.toolFilter === category));
    // Hide empty groups, but never the finder or the entire homepage.
    for (const group of doc.querySelectorAll('.extra-home-panel, .tools-section')) {
      group.hidden = !group.querySelector('.tool-card:not([hidden]), .extra-home-card:not([hidden])');
    }
  };
  input.addEventListener('input', render);
  input.addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;
    const first = all.find(item => !item.el.hidden);
    if (first) { event.preventDefault(); first.el.focus(); first.el.scrollIntoView({block:'center'}); }
  });
  controls.forEach(button => button.addEventListener('click', () => {
    category = button.dataset.toolFilter || 'all';
    render();
  }));
  clear?.addEventListener('click', () => { category = 'all'; input.value = ''; render(); input.focus(); });
  doc.addEventListener('keydown', event => {
    const target = event.target;
    const isTyping = target?.closest?.('input,textarea,select,[contenteditable="true"]');
    if (event.key === '/' && !event.ctrlKey && !event.altKey && !event.metaKey && !isTyping && !doc.getElementById('homeTool')?.classList.contains('hidden')) {
      event.preventDefault(); input.focus();
    }
    if (event.key === 'Escape' && doc.activeElement === input && input.value) {
      input.value = ''; render();
    }
  });
  render();
}
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => initToolFinder());
  else initToolFinder();
}
