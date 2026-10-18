# Implementation Plan: PDF Grayscale & Ink Saver Converter (`/tools/grayscale-pdf`)

## Phase 1: Core Engine (`src/lib/pdf/grayscale.ts`)
- Implement `convertToGrayscale(pdfBytes: Uint8Array, options: GrayscaleOptions): Promise<Uint8Array>`
- Options:
  - `mode: 'standard' | 'ink-saver' | 'high-contrast'`
  - `lightenPercent?: number` (default: 15 for ink-saver)
- Core logic:
  - Load with `PDFDocument.load(pdfBytes)`.
  - For each page, inspect `Contents` streams.
  - Decompress with `decodePDFRawStream` or stream byte retrieval.
  - Convert RGB vector operators (`rg`, `RG`) and CMYK (`k`, `K`) to DeviceGray (`g`, `G`).
  - Handle image XObjects in Resources, desaturating RGB pixel buffers or re-encoding to DeviceGray.
  - Serialize back to Uint8Array with `{ useObjectStreams: false }`.

## Phase 2: Unit Testing (`tests/pdf/grayscale.test.ts`)
- Test 1: Vector RGB streams transformed to DeviceGray operators.
- Test 2: Ink-saver mode lightens dark grayscale levels.
- Test 3: Output PDF loads cleanly and renders valid pages.

## Phase 3: Content Collection & Astro Route
- Add `src/content/tools/grayscale-pdf.md` with category `'optimize'`, icon `'contrast'`, detailed how-to steps, FAQs, and SEO copy.
- Implement `src/components/tools/GrayscalePdfIsland.astro` with mode toggles, progress bar, file size indicator, and download button.
- Wire route in `src/pages/tools/[slug].astro` and Footer link in `src/components/layout/Footer.astro`.

## Phase 4: Build, Deploy & Dual Audit
- Run `npm run test` (verify all 12 test suites pass).
- Run `npm run build`.
- Commit and push to git master.
- Deploy to Cloudflare Pages (`airpdf` and `pdfzero`).
- Run Dual Audit (Human UX check + AI security validation).
