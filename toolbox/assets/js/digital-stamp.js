const $ = (id) => document.getElementById(id);

const defaults = {
  name: 'AKELUWA Softwarehub',
  address: 'Kathmandu, Nepal',
  registration: '',
  center: 'AUTHORIZED',
  date: '',
  shape: 'round',
  color: '#0b4ea2',
};

function esc(value='') {
  return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function cleanText(value, fallback='') {
  return String(value || fallback).trim().replace(/\s+/g, ' ').slice(0, 80);
}
function fitText(text, maxChars=36) {
  const value = cleanText(text);
  return value.length <= maxChars ? value : value.slice(0, maxChars - 1) + '…';
}
function dateLabel(value) {
  if (!value) return '';
  const d = new Date(value + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { year:'numeric', month:'short', day:'2-digit' });
}
function readLogo(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    if (file.size > 4 * 1024 * 1024) return reject(new Error('Logo must be smaller than 4 MB.'));
    const allowed = ['image/png','image/jpeg','image/webp','image/svg+xml'];
    if (!allowed.includes(file.type)) return reject(new Error('Use PNG, JPG, WebP, or SVG for the logo.'));
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read the logo.'));
    reader.readAsDataURL(file);
  });
}
function shapeGeometry(shape) {
  if (shape === 'rect') return { kind:'rect', x:38, y:74, width:424, height:352, rx:18, cx:250, cy:250, rxEllipse:0, ryEllipse:0 };
  if (shape === 'oval') return { kind:'ellipse', cx:250, cy:250, rxEllipse:220, ryEllipse:165 };
  return { kind:'ellipse', cx:250, cy:250, rxEllipse:205, ryEllipse:205 };
}
function buildSvg(state) {
  const color = /^#[0-9a-f]{6}$/i.test(state.color) ? state.color : defaults.color;
  const name = fitText(state.name || 'YOUR BUSINESS', 42).toUpperCase();
  const address = fitText(state.address || 'YOUR LOCATION', 48).toUpperCase();
  const reg = fitText(state.registration, 36).toUpperCase();
  const center = fitText(state.center, 24).toUpperCase();
  const date = dateLabel(state.date).toUpperCase();
  const geo = shapeGeometry(state.shape);
  const logo = state.logoData ? `<image href="${esc(state.logoData)}" x="190" y="173" width="120" height="92" preserveAspectRatio="xMidYMid meet"/>` : '';
  const centerY = state.logoData ? 300 : 270;
  const regY = state.logoData ? 337 : 312;
  const dateY = reg ? regY + 34 : regY;

  let border = '';
  if (geo.kind === 'rect') {
    border = `
      <rect x="${geo.x}" y="${geo.y}" width="${geo.width}" height="${geo.height}" rx="${geo.rx}" fill="none" stroke="${color}" stroke-width="14"/>
      <rect x="${geo.x + 20}" y="${geo.y + 20}" width="${geo.width - 40}" height="${geo.height - 40}" rx="${Math.max(4,geo.rx-6)}" fill="none" stroke="${color}" stroke-width="4"/>
      <line x1="86" y1="156" x2="414" y2="156" stroke="${color}" stroke-width="3"/>
      <line x1="86" y1="365" x2="414" y2="365" stroke="${color}" stroke-width="3"/>
    `;
  } else {
    border = `
      <ellipse cx="${geo.cx}" cy="${geo.cy}" rx="${geo.rxEllipse}" ry="${geo.ryEllipse}" fill="none" stroke="${color}" stroke-width="14"/>
      <ellipse cx="${geo.cx}" cy="${geo.cy}" rx="${geo.rxEllipse-22}" ry="${geo.ryEllipse-22}" fill="none" stroke="${color}" stroke-width="4"/>
      <circle cx="92" cy="250" r="6" fill="${color}"/><circle cx="408" cy="250" r="6" fill="${color}"/>
    `;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 500 500" role="img" aria-label="Digital stamp preview">
    <rect width="500" height="500" fill="none"/>
    ${border}
    <g fill="${color}" font-family="Arial, Helvetica, sans-serif" text-anchor="middle">
      <text x="250" y="130" font-size="29" font-weight="800" letter-spacing="1.3">${esc(name)}</text>
      <text x="250" y="163" font-size="16" font-weight="600" letter-spacing=".8">${esc(address)}</text>
      ${logo}
      ${center ? `<text x="250" y="${centerY}" font-size="31" font-weight="900" letter-spacing="2">${esc(center)}</text>` : ''}
      ${reg ? `<text x="250" y="${regY}" font-size="16" font-weight="700" letter-spacing=".7">${esc(reg)}</text>` : ''}
      ${date ? `<text x="250" y="${dateY}" font-size="16" font-weight="700" letter-spacing=".7">${esc(date)}</text>` : ''}
      <text x="250" y="399" font-size="13" font-weight="700" letter-spacing="2.2">DIGITAL STAMP</text>
    </g>
  </svg>`;
}
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function filename(name, ext) {
  const safe = cleanText(name || 'digital-stamp').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'digital-stamp';
  return `${safe}-stamp.${ext}`;
}

export function initDigitalStamp({ toast = () => {} } = {}) {
  const form = $('stampForm');
  if (!form) return;

  const fields = {
    name: $('stampName'), address: $('stampAddress'), registration: $('stampRegistration'),
    center: $('stampCenterText'), date: $('stampDate'), shape: $('stampShape'),
    color: $('stampColor'), logo: $('stampLogo'), authorized: $('stampAuthorized'),
  };
  const preview = $('stampPreview');
  const status = $('stampStatus');
  const clearLogo = $('clearStampLogo');
  let logoData = null;

  function state() {
    return {
      name: fields.name.value, address: fields.address.value, registration: fields.registration.value,
      center: fields.center.value, date: fields.date.value, shape: fields.shape.value,
      color: fields.color.value, logoData,
    };
  }
  function render() {
    preview.innerHTML = buildSvg(state());
    const ready = Boolean(fields.authorized.checked && cleanText(fields.name.value) && cleanText(fields.address.value));
    $('downloadStampPng').disabled = !ready;
    $('downloadStampSvg').disabled = !ready;
    status.textContent = ready
      ? 'Ready to download. Keep the file only for uses you are authorized to make.'
      : 'Enter a business name and location, then confirm you are authorized to create and use this stamp.';
  }

  form.addEventListener('input', render);
  form.addEventListener('change', render);
  fields.logo.addEventListener('change', async () => {
    try {
      logoData = await readLogo(fields.logo.files?.[0] || null);
      clearLogo.disabled = !logoData;
      render();
    } catch (error) {
      fields.logo.value = ''; logoData = null; clearLogo.disabled = true; render();
      toast(error.message || 'Could not use that logo.');
    }
  });
  clearLogo.addEventListener('click', () => {
    logoData = null; fields.logo.value = ''; clearLogo.disabled = true; render();
  });
  $('stampReset').addEventListener('click', () => {
    fields.name.value = defaults.name; fields.address.value = defaults.address;
    fields.registration.value = defaults.registration; fields.center.value = defaults.center;
    fields.date.value = defaults.date; fields.shape.value = defaults.shape; fields.color.value = defaults.color;
    fields.logo.value = ''; fields.authorized.checked = false; logoData = null; clearLogo.disabled = true; render();
  });
  $('downloadStampSvg').addEventListener('click', () => {
    if (!fields.authorized.checked) return toast('Please confirm you are authorized to create this stamp.');
    const svg = buildSvg(state());
    downloadBlob(new Blob([svg], { type:'image/svg+xml;charset=utf-8' }), filename(fields.name.value, 'svg'));
    toast('SVG stamp downloaded.');
  });
  $('downloadStampPng').addEventListener('click', async () => {
    if (!fields.authorized.checked) return toast('Please confirm you are authorized to create this stamp.');
    const svg = buildSvg(state());
    const blob = new Blob([svg], { type:'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    try {
      await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = url; });
      const canvas = document.createElement('canvas');
      canvas.width = 1600; canvas.height = 1600;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(img,0,0,canvas.width,canvas.height);
      const png = await new Promise(resolve => canvas.toBlob(resolve,'image/png'));
      if (!png) throw new Error('PNG export failed.');
      downloadBlob(png, filename(fields.name.value, 'png'));
      toast('Transparent PNG stamp downloaded.');
    } catch (error) {
      console.error(error); toast('Could not export the PNG. Try SVG instead.');
    } finally {
      URL.revokeObjectURL(url);
    }
  });

  render();
}
