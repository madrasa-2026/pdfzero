# Implementation Plan: PDF White Margin Auto-Cropper & Ink Detector (`/tools/auto-crop-pdf`)

## Phase 1: Pure Engine & Algorithm (`src/lib/pdf/autoCropEngine.ts`)
1. Define interfaces:
   - `BoundingBox`: `{ minX: number; minY: number; maxX: number; maxY: number; width: number; height: number; }`
   - `AutoCropOptions`:
     - `mode`: `'uniform' | 'per-page' | 'even-odd'`
     - `padding`: number (in PDF points, default 10)
     - `threshold`: number (0-255 brightness, default 248)
     - `maxSamplePages`?: number
2. Implement `detectInkBoundingBoxFromImageData(data: Uint8ClampedArray, width: number, height: number, threshold?: number): BoundingBox | null`:
   - Fast 32-bit row/column scanning to locate outer non-white pixels.
   - Return null if blank page.
3. Implement `canvasBoxToPdfBox(box: BoundingBox, canvasWidth: number, canvasHeight: number, pdfWidth: number, pdfHeight: number, padding: number): { x: number; y: number; width: number; height: number }`:
   - Flips Y coordinate from top-left to PDF bottom-left.
   - Clamps within `[0, 0, pdfWidth, pdfHeight]`.
4. Implement `applyAutoCrop(pdfBytes: Uint8Array, cropBoxesPerPage: Array<{ pageIndex: number; x: number; y: number; width: number; height: number }>): Promise<Uint8Array>`:
   - Uses `PDFDocument.load(pdfBytes)`.
   - Iterates pages and sets `page.setCropBox(box.x, box.y, box.width, box.height)`.
   - Saves document with zero rasterization.

## Phase 2: Unit Testing (`tests/pdf/autoCropEngine.test.ts`)
1. Test bounding box detection on synthetic image data (white background with black rectangle in center).
2. Test blank page fallback (returns full dimensions or null).
3. Test PDF coordinate conversion & Y-inversion logic with padding.
4. Test end-to-end PDF CropBox application on a sample `pdf-lib` document:
   - Verifies `page.getCropBox()` reflects the updated bounds.
   - Verifies document saves and remains readable.

## Phase 3: Content Collection Entry (`src/content/tools/auto-crop-pdf.md`)
- Title: "Auto Crop PDF Margins — Smart Blank Space Trimmer"
- Slug: `auto-crop-pdf`
- Category: `organize`
- Icon: `crop`
- Meta description, detailed howToSteps, and 6 thorough FAQs.

## Phase 4: UI Island (`src/components/tools/AutoCropPdfIsland.astro`)
- File dropzone with PDF preview canvas rendering Page 1.
- Animated green bounding box overlay showing detected ink boundaries.
- Mode selector: `Uniform (E-Reader)`, `Per-Page Tight`, `Even/Odd Book`.
- Padding selector (`0 pt`, `10 pt`, `20 pt`, `36 pt`).
- Live percentage trimmed readout.
- "Download Auto-Cropped PDF" action button.

## Phase 5: Routing, Build, Deploy, and Dual Audit
- Register island in `src/pages/tools/[slug].astro`.
- Add link in `src/components/layout/Footer.astro` under Optimize & Repair column.
- Run tests: `npm run test`.
- Run build: `npm run build`.
- Commit and push to git master.
- Deploy to Cloudflare Pages (`airpdf` and `pdfzero`) on `main`.
- Dual Audit: HTTP 200, WebApplication + FAQPage schema, 0 network leaks, visual and UX verification.
