# Implementation Plan: In-Browser PDF Deskew & Straightener (`/tools/deskew-pdf`)

## Phase 1: Core Engine (`src/lib/pdf/deskew.ts`)
- Implement `detectSkewAngleFromCanvas(canvas: HTMLCanvasElement | ImageData): number` using horizontal projection profile variance across $-15^\circ$ to $+15^\circ$.
- Implement `deskewPageTransform(srcW: number, srcH: number, angleDegrees: number): { width: number; height: number; matrix: number[] }`.
- Implement `applyDeskewToPdf(inputBytes: Uint8Array, options: DeskewPdfOptions): Promise<DeskewResult>`.
  - Supports applying deskew angle to specific pages or all pages.
  - Re-encodes pages with proper rotation matrix and white background fill.

## Phase 2: Unit Testing (`tests/pdf/deskew.test.ts`)
- Test 1: Mathematical coordinate transformation and bounding box calculation for rotation.
- Test 2: Angle detection on simulated horizontal text line data.
- Test 3: Multi-page document deskewing producing valid PDF with applied transformation.

## Phase 3: Content Collection & UI Island
- Add `src/content/tools/deskew-pdf.md` (`category: 'optimize'`, `icon: 'refresh-cw'`, `order: 24`).
- Build `src/components/tools/DeskewPdfIsland.astro` (Dropzone, page visualizer with alignment grid overlay, auto-detect button, $-15^\circ$ to $+15^\circ$ fine slider, apply to all pages, download button).
- Wire router in `src/pages/tools/[slug].astro` and Footer link in `src/components/layout/Footer.astro`.

## Phase 4: Build, Deploy & Dual Audit
- Run `npm run test` (all 22 test suites).
- Run `npm run build`.
- Commit and push to git master.
- Deploy to Cloudflare Pages (`airpdf` and `pdfzero`).
- Execute Dual Audit (AI code/security + Human UI test) on `https://airpdf.pages.dev/tools/deskew-pdf`.
