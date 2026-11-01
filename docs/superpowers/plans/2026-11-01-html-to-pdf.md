# Implementation Plan: HTML & Code to PDF Converter (`/tools/html-to-pdf`)

## Phase 1: Pure Engine & Tests
- Implement `src/lib/pdf/htmlEngine.ts`:
  - `generatePrintHtml(rawHtml, rawCss, options)`: Generates self-contained HTML document with scoped CSS, `@page { size, margin }`, color adjust, and viewport styling.
  - `HTML_TEMPLATES`: Export ready-to-use templates (Invoice, Resume, Report).
  - `buildPdfFromCanvases(pages, paperSize)`: Uses `pdf-lib` to stitch canvas image byte buffers into standard A4 or Letter PDFs.
- Implement `tests/pdf/htmlEngine.test.ts`:
  - Test `@page` CSS rule injection with various margins and orientations.
  - Test template retrieval and markup validation.
  - Test PDF creation from image bytes.

## Phase 2: Markdown Content Collection
- Create `src/content/tools/html-to-pdf.md`:
  - SEO title, description, keywords, howToSteps, faqs.
  - Highlights iLovePDF $84/yr paywall contrast, 100% privacy, and enterprise-grade vector printing.

## Phase 3: Astro Island Component
- Create `src/components/tools/HtmlToPdfIsland.astro`:
  - Two-column responsive layout (HTML/CSS editor + sandboxed live preview iframe).
  - File upload (.html, .htm, .txt) dropzone.
  - Template dropdown selector.
  - Controls: Paper Size (A4, Letter, Legal), Orientation (Portrait, Landscape), Margin (None, 10mm, 20mm, 30mm), Backgrounds (On/Off).
  - Export: "Save as Vector PDF (Print Engine)" and "Download PDF".

## Phase 4: Route Registration & Footer Wiring
- Register in `src/pages/tools/[slug].astro`.
- Link in `src/components/layout/Footer.astro` under "Convert & Create".

## Phase 5: Verification & Deploy
- `npm run test` (all 44 test suites pass).
- `npm run build` (56 pages built, sitemaps synced).
- Deploy to Cloudflare Pages (`airpdf` and `pdfzero`).
- Dual audit run: `node scripts/audit_tool.mjs html-to-pdf`.
