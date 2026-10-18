# Implementation Plan: PDF Linearization (Fast Web View Optimizer) (`/tools/linearize-pdf`)

## Phase 1: Core Engine (`src/lib/pdf/linearize.ts`)
- Implement `isPdfLinearized(bytes: Uint8Array): boolean` (scans initial 1024 bytes for `/Linearized`).
- Implement `linearizePdf(inputBytes: Uint8Array, options?: LinearizeOptions): Promise<LinearizeResult>`.
  - Reorders document objects so page 1 resources (fonts, content stream, images) are serialized first.
  - Injects valid `/Linearized 1.0` header dictionary within the first 1024 bytes.
  - Generates compact xref tables and removes unreferenced objects.
  - Returns restructured bytes and metrics (`isLinearized`, `originalSize`, `outputSize`, `pageCount`, `firstPageOffset`).

## Phase 2: Unit Testing (`tests/pdf/linearize.test.ts`)
- Test 1: Detecting non-linearized vs linearized documents.
- Test 2: Linearizing a multi-page PDF document producing a valid `/Linearized 1.0` dictionary within the first 1024 bytes.
- Test 3: Verifying output PDF is structurally valid and loadable by `PDFDocument.load`.

## Phase 3: Content Collection & UI Island
- Add `src/content/tools/linearize-pdf.md` (`category: 'optimize'`, `icon: 'zap'`, `order: 22`).
- Build `src/components/tools/LinearizePdfIsland.astro` (Fast Web View diagnostic badge, streaming simulation card, optimization options, download button).
- Wire router in `src/pages/tools/[slug].astro` and Footer link in `src/components/layout/Footer.astro`.

## Phase 4: Build, Deploy & Dual Audit
- Run `npm run test` (all 20 test suites).
- Run `npm run build`.
- Commit and push to git master.
- Deploy to Cloudflare Pages (`airpdf` and `pdfzero`).
- Execute Dual Audit (AI code/security + Human UI test) on `https://airpdf.pages.dev/tools/linearize-pdf`.
