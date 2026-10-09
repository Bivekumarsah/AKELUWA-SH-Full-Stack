# Pinned PDF libraries

These unmodified distribution files are served by the website and copied into both static builds. The local Python server also serves the three JavaScript files. Keeping the PDF code on the same origin avoids external CDN failures blocking toolbox initialization or PDF processing.

The PDF.js files use the `.js` extension here because Windows can register `.mjs` as `text/plain`, which browsers reject for JavaScript modules. The contents remain unchanged; both scripts still execute as modules.

| File | Version | Source | License |
| --- | --- | --- | --- |
| `pdf-lib/pdf-lib.min.js` | 1.17.1 | https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js | MIT, `pdf-lib/LICENSE.md` |
| `pdfjs/pdf.min.js` | 4.10.38 | https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs | Apache 2.0, `pdfjs/LICENSE` |
| `pdfjs/pdf.worker.min.js` | 4.10.38 | https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs | Apache 2.0, `pdfjs/LICENSE` |

Licenses come from the corresponding upstream release tags: [pdf-lib](https://github.com/Hopding/pdf-lib/blob/v1.17.1/LICENSE.md) and [PDF.js](https://github.com/mozilla/pdf.js/blob/v4.10.38/LICENSE).

Update PDF.js and its worker together. Preserve the upstream files and notices, update this version record, and run the SEO and PDF browser checks after changing a dependency.
