// Public page definitions are shared by the browser and static build.
export const site = {
  name: 'Akeluwa ToolBox',
  origin: 'https://akeluwatoolbox-website.vercel.app',
  description: 'AkeluwaToolBox offers free online PDF and photo tools. Compress, edit, convert and merge files or remove image backgrounds in your browser. No sign-up.',
};

const pageDefinitions = [
  {
    path: '/', tool: 'home', label: 'All tools',
    title: 'Akeluwa ToolBox | Free PDF & Photo Tools Online',
    description: site.description, heading: 'Free online PDF and photo tools',
    intro: 'AkeluwaToolBox helps you prepare files for application forms, email, printing, and sharing. Compress a PDF, reduce a photo to a size in KB, add text to a document, convert images, or organize PDF pages. Choose the tool below and download the result without creating an account.',
    steps: [], notes: ['The hosted tools process files in your browser. The PDF libraries are served by this website; background removal needs an internet connection to load its library and AI model. You do not need to upload your documents to a cloud compression service.'],
    faq: [['What is Akeluwa ToolBox?', 'Akeluwa ToolBox, also written AkeluwaToolBox, is this collection of free browser-based PDF and photo tools. You can edit and compress PDFs, resize photos, convert files, organize PDF pages, and remove image backgrounds without an account.'], ['Which tool should I choose?', 'Use the PDF reducer for document size, the photo reducer for a target size in KB, and the converters to change file formats. Keep your originals so you can compare the downloaded result.'], ['Do I need an account or subscription?', 'The current AkeluwaToolBox tools are free to use without registration or a subscription.'], ['Where are my files processed?', 'On this hosted website, the tools process PDFs and photos in your browser. If you run the optional local PDF service, it processes PDFs on your own computer and deletes temporary files after each request.']],
  },
  {
    path: '/pdf-editor/', tool: 'pdf', label: 'PDF editor',
    title: 'Free Online PDF Editor: Add Text & Images | Akeluwa ToolBox',
    description: 'Edit a PDF online, add text, place a logo or photo, and download the result. Free browser PDF editor with no sign-up.',
    heading: 'How to edit a PDF online',
    intro: 'Add a note, place a logo, or change the visible text of an existing PDF. The editor works on your device and lets you check each page before downloading.',
    steps: ['Open a PDF and select a page.', 'Add text or images, or select recognized text to change its visible appearance.', 'Position and resize your additions, finish editing, and download the PDF.'],
    notes: ['Visible text replacement uses an overlay. This is not secure redaction: underlying information can remain in the file. Scanned text needs OCR, which this editor does not provide.'],
    faq: [['Can I add the same logo to every page?', 'Yes. Choose all PDF pages in the image placement control, then choose whether position and size stay synchronized.'], ['Does editing preserve a digital signature?', 'Changing a signed document can invalidate its signature. Keep the original signed PDF.']],
  },
  {
    path: '/compress-pdf/', tool: 'reducer', label: 'Compress PDF',
    title: 'Compress PDF Online: Reduce PDF File Size | Akeluwa ToolBox',
    description: 'Reduce PDF file size online with a 5–90% target. Preserve text or use visual compression, preview the result, and download for free.',
    heading: 'How to reduce PDF file size',
    intro: 'A smaller PDF is easier to send by email or upload to a form. Choose a reduction target and compare the actual savings before using the result.',
    steps: ['Choose a PDF up to 60 MB and 200 pages.', 'Select a 5–90% reduction target and preserve-text or visual compression.', 'Review the original size, result size, and target status, then download.'],
    example: 'For a 4 MB PDF, a 50% reduction target means aiming for 2 MB. If the smallest result is 2.8 MB, the actual saving is 30% and the target was not reached. Compare readability before using visual compression for a scanned document.',
    notes: ['Preserve-text mode keeps selectable text, links, and forms. Browser optimization can provide little reduction for scans. Visual compression turns pages into images and removes text selection, links, forms, and accessibility tags. Keep your original.'],
    faq: [['Will my PDF reach the requested reduction?', 'The target is not guaranteed. Results depend on the document. The reducer keeps the smallest candidate and returns the original if compression would make it larger.'], ['Can I compress an encrypted or signed PDF?', 'Unlock password-protected PDFs first. Compression can invalidate digital signatures, so retain signed originals.']],
  },
  {
    path: '/compress-photo/', tool: 'photo', label: 'Compress photo',
    title: 'Compress Photo to 100 KB or 200 KB Online | Akeluwa ToolBox',
    description: 'Reduce JPG, PNG, or WebP photo size with 100 KB, 200 KB, and 500 KB targets. Adjust dimensions, compare previews, and download for free.',
    heading: 'How to reduce a photo to a target size in KB',
    intro: 'Prepare a photo for an application form, email, or website. Choose a target such as 100 KB or 200 KB and let the reducer adjust encoding quality and dimensions.',
    steps: ['Choose a JPG, PNG, or WebP photo up to 30 MB.', 'Set the target size, maximum width, quality, and output format.', 'Compare the previews and size change, check whether the target was met, and download.'],
    example: 'If an application form accepts photos up to 200 KB, choose the 200 KB preset and a format the form accepts. Check both the downloaded file size and the minimum dimensions required by the form. A size target can reduce dimensions, so smaller is not always suitable.',
    notes: ['Targets can lower dimensions and are not guaranteed for every image. Smaller photos are not enlarged. PNG and WebP retain transparency; JPG uses a white background for transparent areas. PNG targets use resizing rather than lossy quality adjustments.'],
    faq: [['Can I use 100 KB, 200 KB, or 500 KB?', 'Yes. Choose a preset or enter a target between 10 and 30,000 KB. Leave the target empty to use your selected width and quality directly.'], ['Will compression change the image quality?', 'JPG and WebP compression can discard detail, and resizing changes dimensions. Compare the result with the original, especially when small text must remain readable.']],
  },
  {
    path: '/pdf-converter/', tool: 'converter', label: 'PDF & image converter',
    title: 'Free PDF & Image Converter Online | Akeluwa ToolBox',
    description: 'Convert PDF pages to PNG, combine JPG or PNG photos into a PDF, convert images, merge PDFs, and extract pages in your browser.',
    heading: 'Choose a PDF or image conversion tool',
    intro: 'Use the conversion workspace to turn pages into images, collect photos in a PDF, or organize existing documents. Each panel has its own file input and download control.',
    steps: ['Choose PDF to PNG, images to PDF, image conversion, merging, or page extraction.', 'Select the source files and adjust the options shown in that panel.', 'Download and open the result to check its format, dimensions, and page order.'],
    notes: ['Changing file formats does not guarantee a smaller file. Use the PDF or photo size reducer when file size is your main goal. Large conversions can require significant memory on your device.'],
    faq: [['Are these conversions free?', 'Yes. The current tools do not require an account or payment.'], ['Are my files uploaded?', 'The hosted converters read and process selected files in the browser. Downloads stay under your control.']],
  },
  {
    path: '/jpg-to-pdf/', tool: 'converter', panel: 'image-to-pdf', label: 'JPG & images to PDF',
    title: 'Convert JPG & PNG Images to PDF Online | Akeluwa ToolBox',
    description: 'Combine JPG, PNG, or WebP photos into one PDF. Choose page size and image fit, then download without an account.',
    heading: 'How to convert JPG or PNG photos to PDF',
    intro: 'Put photos, scanned certificates, or screenshots into one document. Each selected image becomes a PDF page, with page size and image fit controlled by you.',
    steps: ['Select JPG, PNG, or WebP images in the order you want them included.', 'Choose the page size and how each image fits on its page.', 'Download the PDF and check the page order and image placement.'],
    notes: ['Fit keeps the entire image within the page; fill can crop edges. Select a page size appropriate for printing or sharing. Use the photo reducer first if the resulting document is too large.'],
    faq: [['Can several images become one PDF?', 'Yes. Select multiple images and the converter adds them as separate pages in one PDF.'], ['Does an image PDF contain selectable text?', 'Text inside a photo remains part of the image. This converter does not perform OCR.']],
  },
  {
    path: '/pdf-to-png/', tool: 'converter', panel: 'pdf-to-image', label: 'PDF to PNG',
    title: 'Convert PDF Pages to PNG Images Online | Akeluwa ToolBox',
    description: 'Export the first page or every PDF page as PNG images. Choose output width and download each image directly from your browser.',
    heading: 'How to save PDF pages as PNG images',
    intro: 'Create image copies of a document for previews, slides, or sharing. The converter renders PDF pages as PNG files at the width you choose.',
    steps: ['Open your PDF in the PDF-to-image panel.', 'Choose the first page or all pages and set the output width.', 'Export the PNG images. Your browser may ask permission for multiple downloads.'],
    notes: ['PNG is the supported PDF image export format. Increasing width creates more pixels and larger files; it cannot restore detail missing from the source. The exported images do not contain selectable PDF text.'],
    faq: [['Can I download every page?', 'Yes. Select all pages. Each page is downloaded as its own PNG image.'], ['How can I make the exported image smaller?', 'Choose a lower width or use the photo reducer afterward to resize or convert the PNG to JPG or WebP.']],
  },
  {
    path: '/merge-pdf/', tool: 'converter', panel: 'merge-pdfs', label: 'Merge PDFs',
    title: 'Merge PDF Files Online for Free | Akeluwa ToolBox',
    description: 'Combine two or more PDF documents into one file in your selected order. Merge PDFs in your browser without a sign-up.',
    heading: 'How to merge PDF files into one document',
    intro: 'Combine a form, supporting documents, and other PDF files into a single download. Pages are added document by document in the selected file order.',
    steps: ['Choose at least two PDF files in the order you want them combined.', 'Check the list of selected filenames.', 'Download the merged PDF and verify its page order.'],
    notes: ['Unlock encrypted files before merging. Combining pages can affect interactive features or signatures; inspect the result and keep originals. Merging does not compress the source files.'],
    faq: [['Can I reduce the merged PDF size?', 'Yes. Open the merged file in the PDF reducer afterward and compare the compressed result.'], ['Does merging upload my documents?', 'The hosted merger copies PDF pages locally in your browser. It does not need a cloud upload service.']],
  },
  {
    path: '/extract-pdf-pages/', tool: 'converter', panel: 'extract-pages', label: 'Extract PDF pages',
    title: 'Extract PDF Pages Online for Free | Akeluwa ToolBox',
    description: 'Save selected PDF pages or page ranges into a new PDF. Enter a selection such as 1, 3-5, 8 and download in your browser.',
    heading: 'How to extract selected pages from a PDF',
    intro: 'Share only the pages you need from a larger document. Enter individual page numbers or ranges to create a separate PDF while keeping the original file.',
    steps: ['Choose the PDF containing the pages you need.', 'Enter page numbers or ranges, for example 1, 3-5, 8.', 'Download the extracted PDF and check that it contains the intended pages.'],
    example: 'Entering 1, 3-5, 8 in a document with at least eight pages creates a five-page PDF containing pages 1, 3, 4, 5, and 8. Repeated page numbers are included once, and output pages follow their order in the original document.',
    notes: ['Page numbers start at 1 and must exist in the selected document. Extraction copies pages into a new file; it does not delete pages from your original. Keep signed originals because changes can invalidate signatures.'],
    faq: [['Can I extract one page?', 'Yes. Enter a single page number, such as 4.'], ['Can I choose a range?', 'Yes. Use a range such as 3-5, or combine ranges with individual pages separated by commas.']],
  },
  {
    path: '/remove-background/', tool: 'background', label: 'Remove background',
    title: 'Free Image Background Remover Online | Akeluwa ToolBox',
    description: 'Remove a photo background with browser AI and download a transparent PNG. Preview the cutout without an account.',
    heading: 'How to remove an image background',
    intro: 'Create a transparent cutout for a portrait, product photo, or design. The tool loads an AI model and processes the chosen image on your device.',
    steps: ['Choose a PNG, JPG, or WebP image up to 20 MB.', 'Start background removal and wait for the model and processing to finish.', 'Compare the original with the cutout and download the transparent PNG.'],
    notes: ['The first run needs an internet connection to download the AI model. Clear separation between the subject and background usually helps. Complex hair, transparent objects, or similar foreground and background colors can need further editing.'],
    faq: [['What format is the downloaded cutout?', 'The output is a PNG with transparency.'], ['Is there a manual edge editor?', 'This tool provides an automatic cutout and preview. It does not currently include manual edge correction.']],
  },
];

export function normalizeBasePath(value = '') {
  const path = String(value).replace(/\/$/, '');
  if (!/^(\/[a-z0-9][a-z0-9_-]*)*$/.test(path)) throw new Error('The site base path must contain only simple URL path segments.');
  return path;
}
const browserBasePath = typeof document === 'undefined' ? '' : normalizeBasePath(document.body.dataset.siteBase || '');
export function sitePath(path, basePath = browserBasePath) {
  const base = normalizeBasePath(basePath);
  return base && !path.startsWith(base + '/') && path !== base ? base + path : path;
}
export const pages = pageDefinitions.map(page => ({ ...page, path: sitePath(page.path) }));
export const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
export const pageFor = (tool, panel) => pages.find(page => page.tool === tool && (panel ? page.panel === panel : !page.panel)) || pages.find(page => page.tool === tool && !page.panel) || pages[0];

export function normalizeOrigin(value = site.origin) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('SITE_URL must be an HTTPS website origin without a path, query, or credentials.');
  }
  return url.origin;
}

export function renderGuide(page, basePath = browserBasePath) {
  const links = pages.filter(other => sitePath(other.path, basePath) !== sitePath(page.path, basePath)).map(other => `<a href="${sitePath(other.path, basePath)}">${escapeHtml(other.label)}</a>`).join('');
  const steps = page.steps.length ? `<ol>${page.steps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}</ol>` : '';
  const breadcrumb = page.tool === 'home' ? '' : `<nav class="breadcrumbs" aria-label="Breadcrumb"><ol><li><a href="${sitePath('/', basePath)}">${escapeHtml(site.name)}</a></li><li aria-current="page">${escapeHtml(page.label)}</li></ol></nav>`;
  const example = page.example ? `<h3>Practical example</h3><p>${escapeHtml(page.example)}</p>` : '';
  return `<section class="seo-guide" id="toolGuide" aria-labelledby="guideTitle">${breadcrumb}<h2 id="guideTitle">${escapeHtml(page.heading)}</h2><p>${escapeHtml(page.intro)}</p>${steps}${example}${page.notes.map(note => `<p>${escapeHtml(note)}</p>`).join('')}<h3>Common questions</h3>${page.faq.map(([question, answer]) => `<details><summary>${escapeHtml(question)}</summary><p>${escapeHtml(answer)}</p></details>`).join('')}<nav class="related-tools" aria-label="Related file tools">${links}</nav></section>`;
}

export function structuredData(page, origin = site.origin, basePath = browserBasePath) {
  const url = origin + page.path;
  const home = origin + sitePath('/', basePath);
  const application = {
    '@type': 'WebApplication', '@id': url + '#application', name: page.tool === 'home' ? site.name : `${page.label} — ${site.name}`,
    url, description: page.description, applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any device with a supported web browser',
    offers: {'@type': 'Offer', price: '0', priceCurrency: 'USD'},
  };
  const graph = [application];
  if (page.tool === 'home') graph.push({
    '@type': 'WebSite', '@id': home + '#website', name: site.name,
    alternateName: ['AkeluwaToolBox', 'Akeluwa Toolbox', new URL(origin).hostname], url: home, description: site.description,
  });
  else graph.push({'@type': 'BreadcrumbList', itemListElement: [
    {'@type': 'ListItem', position: 1, name: site.name, item: home},
    {'@type': 'ListItem', position: 2, name: page.label, item: url},
  ]});
  graph.push({
    '@type': 'WebPage', '@id': url + '#webpage', url, name: page.title,
    description: page.description, inLanguage: 'en',
    isPartOf: {'@id': home + '#website'}, mainEntity: {'@id': application['@id']},
  });
  return {'@context': 'https://schema.org', '@graph': graph};
}

const metaValues = (page, origin, noindex = false, basePath = browserBasePath) => [
  ['name', 'application-name', site.name],
  ['name', 'description', page.description], ['name', 'robots', noindex ? 'noindex, follow' : 'index, follow'],
  ['property', 'og:title', page.title], ['property', 'og:description', page.description], ['property', 'og:type', 'website'],
  ['property', 'og:site_name', site.name], ['property', 'og:url', origin + page.path],
  ['property', 'og:image', origin + sitePath('/assets/images/logo.png', basePath)], ['property', 'og:image:alt', site.name + ' logo'],
  ['name', 'twitter:card', 'summary_large_image'], ['name', 'twitter:title', page.title],
  ['name', 'twitter:description', page.description], ['name', 'twitter:image', origin + sitePath('/assets/images/logo.png', basePath)],
];

export function renderPage(template, page, origin = site.origin, noindex = false, basePath = '') {
  origin = normalizeOrigin(origin);
  basePath = normalizeBasePath(basePath);
  page = { ...page, path: sitePath(page.path, basePath) };
  let html = template.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(page.title)}</title>`);
  for (const [attribute, key, value] of metaValues(page, origin, noindex, basePath)) {
    const pattern = new RegExp(`<meta ${attribute}="${key.replace(/\./g, '\\.')}"[^>]*>`);
    const tag = `<meta ${attribute}="${key}" content="${escapeHtml(value)}" />`;
    html = pattern.test(html) ? html.replace(pattern, tag) : html.replace('</head>', `  ${tag}\n</head>`);
  }
  html = html.replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${origin + page.path}" />`);
  html = html.replace(/<body[^>]*>/, `<body data-seo-path="${page.path}" data-seo-noindex="${noindex}" data-site-base="${basePath}">`);
  html = html.replace(/<script id="site-origin" type="application\/json">[^<]*<\/script>/, `<script id="site-origin" type="application/json">${JSON.stringify(origin)}</script>`);
  html = html.replace(/<script id="structured-data" type="application\/ld\+json">[\s\S]*?<\/script>/, `<script id="structured-data" type="application/ld+json">${JSON.stringify(structuredData(page, origin, basePath)).replace(/</g, '\\u003c')}</script>`);
  html = html.replace(/<!-- seo-guide:start -->[\s\S]*?<!-- seo-guide:end -->/, `<!-- seo-guide:start -->${renderGuide(page, basePath)}<!-- seo-guide:end -->`);
  const visibleId = page.tool + 'Tool';
  html = html.replace(/<(section|div) class="([^"]*)" id="(homeTool|pdfTool|reducerTool|photoTool|converterTool|backgroundTool)"/g, (_, tag, classes, id) => {
    const names = classes.split(' ').filter(name => name !== 'hidden');
    if (id !== visibleId) names.push('hidden');
    return `<${tag} class="${names.join(' ')}" id="${id}"`;
  });
  html = html.replace(/<section class="converter-panel" id="([^"]+)"/g, (_, id) => `<section class="converter-panel${page.panel && page.panel !== id ? ' hidden' : ''}" id="${id}"`);
  if (page.tool === 'converter') {
    html = html.replace(/(<h1 id="converterTitle">)[^<]*(<\/h1>)/, (_, open, close) => open + escapeHtml(page.title.split(' | ')[0]) + close);
  }
  html = html.replace(/class="tool-tab(?: active)?"([^>]*?)data-tool="([^"]+)"(?: aria-current="page")?/g, (_, middle, tool) => `class="tool-tab${tool === page.tool ? ' active' : ''}"${middle}data-tool="${tool}"${tool === page.tool ? ' aria-current="page"' : ''}`);
  // Mount only local HTML URLs and module/worker imports; external URLs and PDF content are untouched.
  html = html.replace(/(\b(?:href|src)=["'])(\/(?!\/)[^"']*)/g, (_, prefix, path) => prefix + sitePath(path, basePath));
  html = html.replace(/(\bfrom\s*["']|workerSrc\s*=\s*["'])(\/(?!\/)[^"']*)/g, (_, prefix, path) => prefix + sitePath(path, basePath));
  return html;
}

export function pageFromLocation() {
  const path = location.pathname.replace(/\/index\.html$/, '/').replace(/\/?$/, '/');
  const matched = pages.find(page => page.path === path);
  if (matched && matched.tool !== 'home') return matched;
  const tool = new URLSearchParams(location.search).get('tool');
  return tool ? pageFor(tool) : (matched || pages[0]);
}

export function updateSeo(page, navigate = false) {
  const origin = normalizeOrigin(JSON.parse(document.getElementById('site-origin').textContent));
  const noindex = document.body.dataset.seoNoindex === 'true';
  document.title = page.title;
  if (page.tool === 'converter') document.getElementById('converterTitle').textContent = page.title.split(' | ')[0];
  for (const [attribute, key, value] of metaValues(page, origin, noindex)) {
    let meta = document.querySelector(`meta[${attribute}="${key}"]`);
    if (!meta) { meta = document.createElement('meta'); meta.setAttribute(attribute, key); document.head.append(meta); }
    meta.content = value;
  }
  document.querySelector('link[rel="canonical"]').href = origin + page.path;
  document.getElementById('structured-data').textContent = JSON.stringify(structuredData(page, origin));
  document.getElementById('toolGuide').outerHTML = renderGuide(page);
  document.body.dataset.seoPath = page.path;
  if (navigate && (location.pathname !== page.path || location.search)) history.pushState({}, '', page.path);
}
