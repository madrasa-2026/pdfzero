# Implementation Plan: In-Browser PDF Page Resizer & Margin Expander (`/tools/resize-pdf`)

## Phase 1: Core Engine (`src/lib/pdf/resize.ts`)
- Implement `calculateFitBounds(srcW: number, srcH: number, targetW: number, targetH: number, margin?: number): { x: number; y: number; width: number; height: number }`
- Implement `resizePdfPages(pdfBytes: Uint8Array, options: ResizeOptions): Promise<ResizeResult>`
- Support target presets: `a4`, `letter`, `legal`, `a3`, `a5`, `tabloid`, `custom`.
- Support strategies: `'fit'` (scale proportionally) and `'expand'` (add margins around original).

## Phase 2: Unit Testing (`tests/pdf/resize.test.ts`)
- Test 1: Math calculation for Letter to A4 proportional fitting.
- Test 2: Canvas expansion adding margin gutter without scaling.
- Test 3: Multi-page document conversion producing valid PDF with target dimensions.

## Phase 3: Content Collection & UI Island
- Add `src/content/tools/resize-pdf.md` with category `'optimize'`, icon `'maximize'`, how-to steps, and FAQs.
- Implement `src/components/tools/ResizePdfIsland.astro` with paper preset cards, strategy toggle, margin sliders, live visualizer, and download button.
- Wire route in `src/pages/tools/[slug].astro` and Footer link in `src/components/layout/Footer.astro`.

## Phase 4: Build, Deploy & Dual Audit
- Run `npm run test` (verify all 18 test suites pass).
- Run `npm run build`.
- Commit and push to git master.
- Deploy to Cloudflare Pages (`airpdf` and `pdfzero`).
- Run Dual Audit (AI security verification + Human UI test).
