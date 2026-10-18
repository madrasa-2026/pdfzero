# Implementation Plan: PDF Prepress Bleed, Trim & Registration Marks Stamper (`/tools/printer-marks-pdf`)

## Phase 1: Pure Engine (`src/lib/pdf/printerMarksEngine.ts`)
1. Define interfaces:
   - `PrinterMarksOptions`:
     - `slugMargin`: number (PDF points, default 36 pt)
     - `bleed`: number (PDF points, default 9 pt = ~3 mm / 0.125 in)
     - `includeTrimMarks`: boolean (default true)
     - `includeBleedMarks`: boolean (default true)
     - `includeRegistrationMarks`: boolean (default true)
     - `includeColorBars`: boolean (default true)
     - `includeSlugLine`: boolean (default true)
     - `fileName`?: string
2. Implement vector drawing helper functions:
   - `drawCornerTrimMarks(page, trimX, trimY, trimW, trimH, offset, length)`
   - `drawRegistrationTarget(page, centerX, centerY, radius)`
   - `drawCmykColorBars(page, startX, startY, swatchSize)`
   - `drawSlugLine(page, text, x, y, font)`
3. Implement `applyPrinterMarks(pdfBytes: Uint8Array, options?: Partial<PrinterMarksOptions>): Promise<Uint8Array>`:
   - Loads source `PDFDocument`.
   - Creates destination `PDFDocument`.
   - For each page:
     - Embeds source page as `PDFPage` / `FormXObject`.
     - Allocates expanded destination page `[srcWidth + 2 * slugMargin, srcHeight + 2 * slugMargin]`.
     - Draws embedded source page centered at `(slugMargin, slugMargin)`.
     - Sets `/TrimBox [slugMargin, slugMargin, slugMargin + srcWidth, slugMargin + srcHeight]`.
     - Sets `/BleedBox [slugMargin - bleed, slugMargin - bleed, slugMargin + srcWidth + bleed, slugMargin + srcHeight + bleed]`.
     - Stamps vector trim ticks, registration bullseyes, CMYK calibration color bars, and slug line text.
   - Saves with 100% vector fidelity.

## Phase 2: Unit Testing (`tests/pdf/printerMarksEngine.test.ts`)
1. Tests that destination page dimensions expand by exactly `2 * slugMargin`.
2. Tests that TrimBox and BleedBox are correctly configured.
3. Tests that corner trim marks, registration marks, and CMYK color bars are stamped cleanly.
4. Tests that output PDF is valid and has expected page count.

## Phase 3: Content Collection Entry (`src/content/tools/printer-marks-pdf.md`)
- Title: "PDF Printer Marks Stamper — Prepress Bleed, Trim & Registration Marks"
- Slug: `printer-marks-pdf`
- Category: `optimize`
- Icon: `maximize`
- How-to steps and 6 detailed FAQs.

## Phase 4: UI Island (`src/components/tools/PrinterMarksPdfIsland.astro`)
- Dropzone for source design.
- Configuration panel:
  - Slug Margin selector (`24 pt`, `36 pt Standard`, `54 pt`).
  - Bleed Distance selector (`0 mm`, `3 mm Standard`, `5 mm`).
  - Toggles for Trim Marks, Registration Targets, CMYK Color Bars, and Slug Line.
- Interactive canvas sheet preview with red trim lines and cyan bleed lines.
- One-click "Download Print-Ready PDF" button.

## Phase 5: Routing, Build, Deploy, and Dual Audit
- Add island to `src/pages/tools/[slug].astro`.
- Add link to `src/components/layout/Footer.astro` under Optimize & Repair.
- Run tests (`npm run test`).
- Run build (`npm run build`).
- Git commit & push.
- Cloudflare Pages deploy (`airpdf` and `pdfzero`) on `main`.
- Dual Audit.
