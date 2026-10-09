// Photo compression stays on the device with native browser image encoders.
const MAX_BYTES = 30 * 1024 * 1024;
const MAX_PIXELS = 40_000_000;
const CANVAS_PIXELS = 8_000_000;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const bytesLabel = n => n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(2)} MB`;
const cancelled = signal => { if (signal.aborted) throw new DOMException('Cancelled', 'AbortError'); };

async function decodePhoto(file) {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    return { image: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return { image, width: image.naturalWidth, height: image.naturalHeight, close: () => URL.revokeObjectURL(url) };
  } catch (error) { URL.revokeObjectURL(url); throw error; }
}

function encode(canvas, type, quality) {
  return new Promise((resolve, reject) => canvas.toBlob(blob => {
    if (!blob) return reject(new Error('The browser could not save this image. Try a smaller width.'));
    if (blob.type !== type) return reject(new Error('This browser cannot export that format. Choose JPG or PNG.'));
    resolve(blob);
  }, type, type === 'image/png' ? undefined : quality));
}

async function compressPhoto(file, source, options, signal, report) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Image processing is unavailable in this browser.');
  const scale = Math.min(1, options.width / source.width, Math.sqrt(CANVAS_PIXELS / (source.width * source.height)));
  let width = Math.max(1, Math.round(source.width * scale));
  let height = Math.max(1, Math.round(source.height * scale));
  let smallest = null;
  const qualityFloor = Math.min(.35, options.quality);
  try {
    for (let pass = 0; pass < 7; pass++) {
      cancelled(signal);
      report(Math.round(pass / 7 * 90), `Optimizing ${width} × ${height}px…`);
      canvas.width = width; canvas.height = height;
      if (options.type === 'image/jpeg') {
        context.fillStyle = '#ffffff'; context.fillRect(0, 0, width, height);
      }
      context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high';
      context.drawImage(source.image, 0, 0, width, height);
      const make = async quality => {
        cancelled(signal);
        const blob = await encode(canvas, options.type, quality);
        cancelled(signal);
        const candidate = { blob, width, height, quality, original: false };
        if (!smallest || blob.size < smallest.blob.size) smallest = candidate;
        return candidate;
      };
      let high = await make(options.quality);
      if (!options.target || high.blob.size <= options.target) {
        // Keep an already optimized original when format and dimensions match.
        if (file.type === options.type && width === source.width && height === source.height && file.size < high.blob.size) {
          return { blob: file, width, height, original: true };
        }
        return high;
      }
      let low = high;
      if (options.type !== 'image/png') {
        report(Math.round(pass / 7 * 90 + 5), 'Finding the best quality for your target size…');
        low = await make(qualityFloor);
        if (low.blob.size <= options.target) {
          let left = qualityFloor, right = options.quality, best = low;
          // Bound work while keeping the highest tested quality within the target.
          for (let attempt = 0; attempt < 6; attempt++) {
            const midpoint = (left + right) / 2;
            const candidate = await make(midpoint);
            if (candidate.blob.size <= options.target) { best = candidate; left = midpoint; }
            else right = midpoint;
          }
          return best;
        }
      }
      if (Math.max(width, height) <= 128 || pass === 6) break;
      const factor = Math.max(.5, Math.min(.85, Math.sqrt(options.target / low.blob.size) * .9));
      const nextScale = Math.max(factor, 128 / Math.max(width, height));
      width = Math.max(1, Math.floor(width * nextScale));
      height = Math.max(1, Math.floor(height * nextScale));
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    return smallest;
  } finally { canvas.width = canvas.height = 0; }
}

export function initPhotoReducer() {
  const $ = id => document.getElementById(id);
  const state = { file: null, source: null, originalUrl: null, resultUrl: null, ticket: 0, busy: false, loading: false, controller: null };
  const controls = ['photoInput', 'photoFormat', 'photoWidth', 'photoTarget', 'photoQuality'];
  const presets = [...document.querySelectorAll('[data-photo-target]')];
  const status = message => { $('photoStatus').textContent = message; };
  function clearResult() {
    $('photoResultImage').removeAttribute('src');
    if (state.resultUrl) URL.revokeObjectURL(state.resultUrl);
    state.resultUrl = null;
    $('photoResult').hidden = true;
    $('photoResultImage').hidden = true;
    $('photoResultEmpty').hidden = false;
    $('photoResultMeta').textContent = 'Ready after reduction';
    $('photoDownload').removeAttribute('href');
    $('photoProgressWrap').hidden = true;
  }
  function clearSource() {
    state.source?.close(); state.source = null; state.file = null;
    $('photoOriginal').removeAttribute('src');
    if (state.originalUrl) URL.revokeObjectURL(state.originalUrl);
    state.originalUrl = null;
    $('photoOriginal').hidden = true; $('photoOriginalEmpty').hidden = false;
    $('photoFile').textContent = 'No photo selected';
    $('photoOriginalMeta').textContent = 'Your original image';
  }
  function syncControls() {
    controls.forEach(id => $(id).disabled = state.busy);
    presets.forEach(button => button.disabled = state.busy);
    $('photoQuality').disabled = state.busy || $('photoFormat').value === 'image/png';
    $('photoRun').disabled = state.busy || state.loading || !state.file;
    $('photoRun').textContent = state.busy ? 'Reducing…' : 'Reduce photo size';
    $('photoCancel').hidden = !state.busy;
    $('photoClear').disabled = state.busy;
    $('photoTool').setAttribute('aria-busy', String(state.busy || state.loading));
  }
  function optionsChanged() {
    if (state.busy) return;
    clearResult();
    const png = $('photoFormat').value === 'image/png';
    $('photoQualityValue').textContent = png ? 'Lossless' : `${$('photoQuality').value}%`;
    $('photoFormatNote').textContent = png
      ? 'PNG keeps transparency. To reduce file size, the target can reduce image dimensions; the quality slider does not affect PNG.'
      : $('photoFormat').value === 'image/webp'
        ? 'WebP supports transparency. A size target can lower quality and dimensions; the original proportions are kept.'
        : 'JPG works well for photos. Transparent areas become white. A size target can lower quality and dimensions.';
    const target = Number($('photoTarget').value);
    presets.forEach(button => button.setAttribute('aria-pressed', String(target > 0 && Number(button.dataset.photoTarget) === target)));
    syncControls();
    if (state.file) status('Settings updated. Reduce the photo to create a new result.');
  }
  async function choose(file) {
    if (state.busy || !file) return;
    const ticket = ++state.ticket;
    clearResult(); clearSource();
    state.loading = true; syncControls(); status('Reading your photo…');
    let decoded = null;
    try {
      if (!file.size) throw new Error('This file is empty. Choose a JPG, PNG, or WebP image.');
      if (file.size > MAX_BYTES) throw new Error('Choose a photo no larger than 30 MB.');
      if (!TYPES.includes(file.type) && !/\.(jpe?g|png|webp)$/i.test(file.name)) throw new Error('Please choose a JPG, PNG, or WebP image.');
      decoded = await decodePhoto(file);
      if (ticket !== state.ticket) { decoded.close(); return; }
      if (!decoded.width || !decoded.height || decoded.width * decoded.height > MAX_PIXELS) {
        throw new Error('Choose an image with no more than 40 million pixels.');
      }
      state.file = file; state.source = decoded; decoded = null;
      state.originalUrl = URL.createObjectURL(file);
      $('photoOriginal').src = state.originalUrl;
      $('photoOriginal').hidden = false; $('photoOriginalEmpty').hidden = true;
      $('photoFile').textContent = `${file.name} · ${bytesLabel(file.size)}`;
      $('photoOriginalMeta').textContent = `${state.source.width} × ${state.source.height}px · ${bytesLabel(file.size)}`;
      status('Ready to reduce. Your original photo is kept.');
    } catch (error) {
      decoded?.close();
      if (ticket !== state.ticket) return;
      clearSource();
      status(error.message || 'This image could not be opened. It may be damaged or unsupported.');
    } finally {
      if (ticket === state.ticket) { state.loading = false; syncControls(); }
    }
  }
  async function run() {
    if (!state.file || !state.source || state.busy || state.loading) return;
    const width = Number($('photoWidth').value);
    const targetText = $('photoTarget').value.trim(), target = Number(targetText);
    if (!Number.isInteger(width) || width < 100 || width > 4096) { status('Enter a maximum width from 100 to 4096 pixels.'); $('photoWidth').focus(); return; }
    if (targetText && (!Number.isFinite(target) || target < 10 || target > 30000)) { status('Enter a target from 10 to 30000 KB, or leave it empty.'); $('photoTarget').focus(); return; }
    clearResult(); state.busy = true; syncControls();
    state.controller = new AbortController();
    const signal = state.controller.signal;
    const options = { width, target: targetText ? Math.round(target * 1024) : null, type: $('photoFormat').value, quality: Number($('photoQuality').value) / 100 };
    status('Reducing your photo in this browser…');
    const report = (percent, text) => { $('photoProgressWrap').hidden = false; $('photoProgress').value = percent; $('photoProgressText').textContent = text; };
    try {
      const result = await compressPhoto(state.file, state.source, options, signal, report);
      cancelled(signal);
      if (!result) throw new Error('No output could be created. Try another photo.');
      const percent = 100 * (1 - result.blob.size / state.file.size);
      const targetMet = !options.target || result.blob.size <= options.target;
      const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[result.blob.type];
      if (!extension) throw new Error('Unexpected image format. Try JPG or PNG.');
      const base = state.file.name.replace(/\.[^.]+$/, '').replace(/[^a-z0-9_-]+/gi, '-').slice(0, 100) || 'photo';
      state.resultUrl = URL.createObjectURL(result.blob);
      $('photoResultImage').src = state.resultUrl;
      $('photoResultImage').hidden = false; $('photoResultEmpty').hidden = true;
      $('photoResultMeta').textContent = `${result.width} × ${result.height}px · ${extension.toUpperCase()}${result.quality && options.type !== 'image/png' ? ` · ${Math.round(result.quality * 100)}% quality` : ''}`;
      $('photoBefore').textContent = bytesLabel(state.file.size);
      $('photoAfter').textContent = bytesLabel(result.blob.size);
      $('photoSaved').textContent = percent >= 0 ? `${percent.toFixed(1)}% smaller` : `${Math.abs(percent).toFixed(1)}% larger`;
      $('photoResultTitle').textContent = result.original ? 'Already optimized' : 'Your photo is ready';
      $('photoResultNote').textContent = [
        options.target ? targetMet ? `Target reached: ${bytesLabel(options.target)} or less.` : `The ${bytesLabel(options.target)} target could not be reached. This is the smallest candidate found.` : 'Reduced using your width and quality settings.',
        result.original ? 'The download keeps your original image.' : `${result.width} × ${result.height}px, with the original proportions kept.`,
        percent < 0 ? 'This format produced a larger file. Try JPG or WebP for stronger compression.' : '',
      ].filter(Boolean).join(' ');
      $('photoDownload').href = state.resultUrl;
      $('photoDownload').download = `${base}-${result.original ? 'original' : 'reduced'}.${extension}`;
      $('photoResult').hidden = false;
      report(100, 'Finished'); status(targetMet ? 'Your photo is ready to download.' : 'Finished. Review the result and target details.');
    } catch (error) {
      $('photoProgressWrap').hidden = true;
      status(signal.aborted ? 'Reduction cancelled. Your original photo is ready to try again.' : error.message || 'This photo could not be reduced.');
    } finally { state.busy = false; state.controller = null; syncControls(); }
  }
  $('photoInput').addEventListener('change', event => { choose(event.target.files[0]); event.target.value = ''; });
  $('photoDrop').addEventListener('dragover', event => { event.preventDefault(); if (!state.busy) $('photoDrop').classList.add('drag'); });
  $('photoDrop').addEventListener('dragleave', () => $('photoDrop').classList.remove('drag'));
  $('photoDrop').addEventListener('drop', event => { event.preventDefault(); $('photoDrop').classList.remove('drag'); choose(event.dataTransfer.files[0]); });
  ['photoFormat', 'photoWidth', 'photoTarget', 'photoQuality'].forEach(id => $(id).addEventListener('input', optionsChanged));
  presets.forEach(button => button.addEventListener('click', () => { $('photoTarget').value = button.dataset.photoTarget; optionsChanged(); }));
  $('photoRun').addEventListener('click', run);
  $('photoCancel').addEventListener('click', () => state.controller?.abort());
  $('photoClear').addEventListener('click', () => {
    if (state.busy) return;
    ++state.ticket; state.loading = false; clearResult(); clearSource();
    syncControls(); status('Choose a photo to begin.');
  });
  optionsChanged();
}
