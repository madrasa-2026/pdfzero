# Implementation Plan: PDF Booklet & Imposition Duplex Creator (`/tools/booklet-pdf`)

## Phase 1: Core Engine (`src/lib/pdf/booklet.ts`)
- Implement `calculateSaddleStitchOrder(pageCount: number, isRtl = false): Array<{ left: number | null; right: number | null }>`
- Implement `createBookletPdf(pdfBytes: Uint8Array, options: BookletOptions): Promise<BookletResult>`
- Options:
  - `mode: 'booklet' | '2-up' | '4-up'`
  - `binding: 'ltr' | 'rtl'`
  - `gutter: number` (pt)
  - `drawFoldLine: boolean`
- Return `imposedBytes: Uint8Array`, `sheetsGenerated: number`, `paddedPageCount: number`, and sheet mapping details.

## Phase 2: Unit Testing (`tests/pdf/booklet.test.ts`)
- Test 1: Math verification for 4-page and 8-page saddle-stitch sequences.
- Test 2: Automatic padding of 5 pages to 8 pages with null/blank slots.
- Test 3: Creation of valid 2-Up landscape PDF with embedded pages and fold line.

## Phase 3: Content Collection & UI Island
- Add `src/content/tools/booklet-pdf.md` with category `'organize'`, icon `'book-open'`, how-to steps, and FAQs.
- Implement `src/components/tools/BookletPdfIsland.astro` with file dropzone, mode selector, fold line toggle, live sheet breakdown card, and download button.
- Wire route in `src/pages/tools/[slug].astro` and Footer link in `src/components/layout/Footer.astro`.

## Phase 4: Build, Deploy & Dual Audit
- Run `npm run test` (verify all 13 test suites pass).
- Run `npm run build`.
- Commit and push to git master.
- Deploy to Cloudflare Pages (`airpdf` and `pdfzero`).
- Run Dual Audit (AI security verification + Human UI test).
