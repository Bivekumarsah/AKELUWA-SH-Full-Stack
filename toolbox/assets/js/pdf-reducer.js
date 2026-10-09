// PDF compression for static hosting and the optional same-origin local engine.
import { sitePath } from './seo.js';
const MAX_BYTES = 60 * 1024 * 1024;
const MAX_PAGES = 200;
const MAX_PIXELS = 4_000_000;
const bytesLabel = n => n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(2)} MB`;
const cancelled = signal => { if (signal.aborted) throw new DOMException('Cancelled', 'AbortError'); };
const yieldFrame = () => new Promise(resolve => setTimeout(resolve, 0));

export function initPdfReducer({ pdfjsLib, PDFLib }) {
  const $ = id => document.getElementById(id);
  const state = { file: null, bytes: null, doc: null, resultUrl: null, busy: false, ticket: 0, controller: null, local: null };
  const controls = ['reduceInput', 'reduceTarget', 'reducePreserve', 'reduceVisual', 'reduceAutomatic'];
  const status = text => { $('reduceStatus').textContent = text; };
  function progress(value, text) {
    $('reduceProgressWrap').hidden = false;
    if (value === null) $('reduceProgress').removeAttribute('value');
    else $('reduceProgress').value = value;
    $('reduceProgressText').textContent = text;
  }
  function clearResult() {
    if (state.resultUrl) URL.revokeObjectURL(state.resultUrl);
    state.resultUrl = null;
    $('reduceResult').hidden = true;
    $('reduceDownload').removeAttribute('href');
    $('reduceProgressWrap').hidden = true;
  }
  function busy(value) {
    state.busy = value;
    controls.forEach(id => $(id).disabled = value);
    document.querySelectorAll('[data-reduction]').forEach(el => el.disabled = value);
    $('reduceRun').disabled = value || !state.file;
    $('reduceRun').textContent = value ? 'Compressing…' : 'Compress PDF';
    $('reduceCancel').hidden = !value;
    $('reduceClear').disabled = value;
    $('reducerTool').setAttribute('aria-busy', String(value));
  }
  function modeNotice() {
    const visual = $('reduceVisual').checked;
    $('reduceModeNote').textContent = visual
      ? 'Visual compression turns pages into images. Text selection, links, forms, and accessibility tags are lost. Keep your original.'
      : state.local
        ? 'Keeps selectable text and interactive content, while optimizing embedded images. Image quality may decrease.'
        : 'Keeps text and interactive content. Browser optimization is gentle; scanned PDFs usually need visual compression for a large reduction.';
  }
  function targetChanged() {
    const target = Number($('reduceTarget').value);
    $('reduceTargetValue').textContent = `${target}%`;
    $('reduceTarget').setAttribute('aria-valuetext', `${target} percent reduction target`);
    $('reduceEstimate').textContent = state.file
      ? `Aiming for ${bytesLabel(Math.round(state.file.size * (1 - target / 100)))} or less. Actual savings depend on the PDF.`
      : 'A target, rather than a guarantee. Already optimized PDFs may stay the same size.';
    document.querySelectorAll('[data-reduction]').forEach(el => el.setAttribute('aria-pressed', String(Number(el.dataset.reduction) === target)));
    clearResult();
  }
  async function choose(file) {
    if (state.busy || !file) return;
    const ticket = ++state.ticket;
    clearResult();
    const previous = state.doc;
    state.doc = null;
    if (previous) await previous.destroy();
    if (ticket !== state.ticket) return;
    state.file = null; state.bytes = null;
    $('reduceRun').disabled = true;
    $('reduceFile').textContent = 'No PDF selected';
    $('reducePreview').hidden = true;
    $('reducePreviewEmpty').hidden = false;
    $('reducePreview').width = $('reducePreview').height = 0;
    try {
      if (file.size > MAX_BYTES) throw new Error('Choose a PDF no larger than 60 MB.');
      if (!file.size || (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf')) throw new Error('Please choose a PDF file.');
      status('Reading your PDF…');
      const bytes = await file.arrayBuffer();
      if (ticket !== state.ticket) return;
      const task = pdfjsLib.getDocument({ data: bytes.slice(0), isEvalSupported: false });
      task.onPassword = () => { task.destroy(); };
      let doc;
      try { doc = await task.promise; }
      catch { throw new Error('This PDF is password-protected or damaged. Unlock it or choose another file.'); }
      if (ticket !== state.ticket) { await doc.destroy(); return; }
      if (!doc.numPages || doc.numPages > MAX_PAGES) { await doc.destroy(); throw new Error('Choose a PDF with 1 to 200 pages.'); }
      state.doc = doc; state.bytes = bytes; state.file = file;
      const page = await doc.getPage(1), base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: Math.min(400 / base.width, 520 / base.height) });
      const preview = document.createElement('canvas');
      preview.width = Math.ceil(viewport.width); preview.height = Math.ceil(viewport.height);
      await page.render({ canvasContext: preview.getContext('2d'), viewport, background: '#ffffff' }).promise;
      if (ticket !== state.ticket) return;
      $('reducePreview').width = preview.width; $('reducePreview').height = preview.height;
      $('reducePreview').getContext('2d').drawImage(preview, 0, 0);
      preview.width = preview.height = 0;
      $('reducePreview').hidden = false; $('reducePreviewEmpty').hidden = true;
      $('reduceFile').textContent = `${file.name} · ${bytesLabel(file.size)} · ${doc.numPages} page${doc.numPages === 1 ? '' : 's'}`;
      $('reduceRun').disabled = false;
      targetChanged(); status('Ready to compress. Your original file is kept.');
    } catch (error) {
      if (ticket !== state.ticket) return;
      if (state.doc) await state.doc.destroy();
      state.doc = null; state.file = null; state.bytes = null;
      status(error.message || 'This PDF could not be opened.');
    }
  }
  async function detectLocal() {
    // A hosted site never sends PDFs to a remote service or a localhost service.
    if (!['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) return;
    try {
      const response = await fetch(sitePath('/api/pdf-reducer/capabilities/'), { signal: AbortSignal.timeout(3000), cache: 'no-store' });
      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const data = await response.json();
        if (data.engine === 'pymupdf' && data.csrf_token) {
          state.local = data;
          $('reduceEngine').textContent = 'Processing on this computer';
          $('reducePrivacy').textContent = 'Processed by the local service on your computer. Temporary uploads are removed after each request.';
          modeNotice();
        }
      }
    } catch { /* Static servers use the browser engine. */ }
  }
  async function localCompression(target, mode, signal) {
    const form = new FormData();
    form.append('file', state.file); form.append('target', String(target)); form.append('mode', mode);
    progress(null, 'Compressing on this computer…');
    const response = await fetch(sitePath('/api/pdf-reducer/compress/'), {
      method: 'POST', body: form, signal, credentials: 'same-origin',
      headers: { 'X-CSRFToken': state.local.csrf_token },
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'The local reducer could not process this file. Try again.');
    }
    const metadata = JSON.parse(response.headers.get('X-PDF-Result') || '{}');
    return { blob: await response.blob(), ...metadata };
  }
  async function browserCompression(target, mode, signal) {
    let best = new Blob([state.bytes], { type: 'application/pdf' }), flattened = false, method = 'original';
    const targetSize = state.file.size * (1 - target / 100);
    progress(5, 'Optimizing PDF structure…');
    // Re-saving preserves the document tree, including text, links, and form fields.
    const original = await PDFLib.PDFDocument.load(state.bytes.slice(0), { updateMetadata: false });
    cancelled(signal);
    const optimized = new Blob([await original.save({ useObjectStreams: true })], { type: 'application/pdf' });
    if (optimized.size < best.size) { best = optimized; method = 'optimized'; }
    if (mode === 'visual' && best.size > targetSize) {
      const presets = [{ dpi: 180, quality: .85 }, { dpi: 130, quality: .70 }, { dpi: 96, quality: .50 }];
      for (let attempt = 0; attempt < presets.length; attempt++) {
        cancelled(signal);
        const output = await PDFLib.PDFDocument.create();
        let imageBytes = 0, overBudget = false;
        for (let n = 1; n <= state.doc.numPages; n++) {
          cancelled(signal);
          const page = await state.doc.getPage(n), base = page.getViewport({ scale: 1 });
          if (!Number.isFinite(base.width * base.height) || base.width <= 0 || base.height <= 0 || base.width > 14400 || base.height > 14400) throw new Error('This PDF has unsupported page dimensions.');
          const scale = Math.min(presets[attempt].dpi / 72, Math.sqrt(MAX_PIXELS / (base.width * base.height)));
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
          const render = page.render({ canvasContext: canvas.getContext('2d'), viewport, background: '#ffffff' });
          const stop = () => render.cancel();
          signal.addEventListener('abort', stop, { once: true });
          try {
            await render.promise;
            cancelled(signal);
            const jpeg = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', presets[attempt].quality));
            if (!jpeg) throw new Error('The browser could not render this page.');
            imageBytes += jpeg.size;
            // A PDF larger than the current best cannot be selected. Bound memory early.
            if (imageBytes >= best.size || imageBytes > MAX_BYTES) { overBudget = true; break; }
            const image = await output.embedJpg(await jpeg.arrayBuffer());
            output.addPage([base.width, base.height]).drawImage(image, { x: 0, y: 0, width: base.width, height: base.height });
          } finally {
            signal.removeEventListener('abort', stop);
            canvas.width = canvas.height = 0;
            page.cleanup();
          }
          progress(10 + 85 * (attempt + n / state.doc.numPages) / presets.length, `Quality pass ${attempt + 1} of 3 · page ${n} of ${state.doc.numPages}`);
          await yieldFrame();
        }
        cancelled(signal);
        if (!overBudget) {
          const candidate = new Blob([await output.save()], { type: 'application/pdf' });
          if (candidate.size < best.size) { best = candidate; flattened = true; method = 'visual'; }
        }
        if (best.size <= targetSize) break;
        await yieldFrame();
      }
    }
    return { blob: best, flattened, method, target_met: best.size <= targetSize };
  }
  async function run() {
    if (!state.file || state.busy) return;
    clearResult(); busy(true); state.controller = new AbortController();
    const signal = state.controller.signal;
    const target = Number($('reduceTarget').value), mode = $('reduceVisual').checked ? 'visual' : 'preserve';
    status('Compression in progress…');
    try {
      const result = await (state.local ? localCompression(target, mode, signal) : browserCompression(target, mode, signal));
      cancelled(signal);
      const saved = Math.max(0, state.file.size - result.blob.size);
      state.resultUrl = URL.createObjectURL(result.blob);
      const base = state.file.name.replace(/\.pdf$/i, '').replace(/[^a-z0-9_-]+/gi, '-').slice(0, 100) || 'document';
      $('reduceDownload').href = state.resultUrl;
      $('reduceDownload').download = `${base}-${saved ? 'compressed' : 'original'}.pdf`;
      $('reduceBefore').textContent = bytesLabel(state.file.size);
      $('reduceAfter').textContent = bytesLabel(result.blob.size);
      $('reduceSaved').textContent = `${(100 * saved / state.file.size).toFixed(1)}%`;
      $('reduceResultTitle').textContent = saved ? 'Your PDF is ready' : 'Already as small as we could make it';
      $('reduceResultNote').textContent = [
        saved ? `${bytesLabel(saved)} saved. ${result.target_met ? 'Reduction target reached.' : 'The target could not be reached with these settings.'}` : 'No smaller version was found. The download keeps your original PDF.',
        result.flattened ? 'Pages are images; text and interactive features are flattened.' : 'The result keeps the original page content.',
      ].join(' ');
      $('reduceResult').hidden = false;
      progress(100, 'Finished'); status(saved ? 'Compression complete.' : 'Finished. Your PDF did not need a larger replacement.');
      if ($('reduceAutomatic').checked) $('reduceDownload').click();
    } catch (error) {
      $('reduceProgressWrap').hidden = true;
      status(signal.aborted ? 'Compression cancelled. Your original is ready to try again.' : error.message || 'Compression failed. Try another PDF.');
    } finally { busy(false); state.controller = null; }
  }
  $('reduceInput').addEventListener('change', e => { choose(e.target.files[0]); e.target.value = ''; });
  $('reduceDrop').addEventListener('dragover', e => { e.preventDefault(); if (!state.busy) $('reduceDrop').classList.add('drag'); });
  $('reduceDrop').addEventListener('dragleave', () => $('reduceDrop').classList.remove('drag'));
  $('reduceDrop').addEventListener('drop', e => { e.preventDefault(); $('reduceDrop').classList.remove('drag'); choose(e.dataTransfer.files[0]); });
  $('reduceTarget').addEventListener('input', targetChanged);
  ['reducePreserve', 'reduceVisual'].forEach(id => $(id).addEventListener('change', () => { modeNotice(); clearResult(); }));
  document.querySelectorAll('[data-reduction]').forEach(el => el.addEventListener('click', () => { $('reduceTarget').value = el.dataset.reduction; targetChanged(); }));
  $('reduceRun').addEventListener('click', run);
  $('reduceCancel').addEventListener('click', () => state.controller?.abort());
  $('reduceClear').addEventListener('click', async () => {
    if (state.busy) return;
    const ticket = ++state.ticket; clearResult();
    const doc = state.doc;
    Object.assign(state, { file: null, bytes: null, doc: null });
    if (doc) await doc.destroy();
    if (ticket !== state.ticket) return;
    $('reducePreview').hidden = true; $('reducePreviewEmpty').hidden = false;
    $('reducePreview').width = $('reducePreview').height = 0;
    $('reduceFile').textContent = 'No PDF selected'; $('reduceRun').disabled = true;
    targetChanged(); status('Choose a PDF to begin.');
  });
  targetChanged(); modeNotice(); detectLocal();
}
