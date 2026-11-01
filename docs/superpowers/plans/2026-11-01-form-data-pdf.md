# Implementation Plan: PDF Form Data Exporter & Importer (`/tools/form-data-pdf`)

## Phase 1: Engine & Unit Tests
- Implement `src/lib/pdf/formDataEngine.ts`:
  - `extractFormData`: Iterates `form.getFields()` on a `PDFDocument`.
  - `populateForm`: Injects `setText()`, `check()` / `uncheck()`, `select()`.
  - `formFieldsToCsv` / `formFieldsToJson`: Formats parsed data.
- Implement `tests/pdf/formDataEngine.test.ts`:
  - Create a test PDF with text fields and checkboxes.
  - Verify extraction finds field names and values.
  - Verify population sets new values and preserves document integrity.

## Phase 2: Markdown Content Collection
- Create `src/content/tools/form-data-pdf.md`:
  - Frontmatter: title, shortDescription, description, category ('forms'), keywords, howToSteps, faqs.
  - Explains Adobe Acrobat Pro $239/yr paywall contrast and compliance advantages.

## Phase 3: Astro Island Component
- Create `src/components/tools/FormDataPdfIsland.astro`:
  - Mode switch: "Export Form Data" vs "Fill & Import Form Data".
  - Dropzone for PDF and data file (.csv, .json).
  - Field table with inline search.
  - Download buttons: "Download CSV", "Download JSON", "Download Filled PDF".

## Phase 4: Route & Layout Wiring
- Register in `src/pages/tools/[slug].astro`.
- Link in `src/components/layout/Footer.astro` under "Forms & Sign".

## Phase 5: Verification & Deploy
- `npm run test` (all 45 test suites pass).
- `npm run build` (57 pages built, sitemaps synced).
- Deploy to Cloudflare Pages (`airpdf` and `pdfzero`).
- Dual audit run: `node scripts/audit_tool.mjs form-data-pdf`.
