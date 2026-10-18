# Implementation Plan: PDF Interactive Form Field Creator & AcroForm Injector

## Task Breakdown
1. **Engine Implementation (`src/lib/pdf/formCreatorEngine.ts`)**:
   - Define TypeScript interfaces `FormFieldDefinition`, `FieldType`, `AutoDetectResult`.
   - Implement `injectFormFields(pdfBytes, fields)` using `pdf-lib` AcroForm methods.
   - Implement `detectFormFieldsFromText(textItems, pageWidth, pageHeight, pageIndex)`.
   - Implement `getExistingFormFieldsSummary(pdfBytes)`.

2. **Unit Tests (`tests/pdf/formCreatorEngine.test.ts`)**:
   - Test text field injection with default text and multiline option.
   - Test checkbox injection and state toggle.
   - Test dropdown injection with options.
   - Test auto-detect heuristic on mock text items with underscores and labels.
   - Verify all tests pass (`npm run test`).

3. **Markdown Tool Metadata & SEO (`src/content/tools/form-creator-pdf.md`)**:
   - Frontmatter: title, description, category (`edit`), order, keywords, schema, FAQs.
   - Deep-dive technical explanation of AcroForm dictionaries vs static PDF vectors.

4. **Interactive UI Island (`src/components/tools/FormCreatorPdfIsland.astro`)**:
   - PDF upload dropzone + drag & drop.
   - PDF.js canvas renderer with responsive scaling.
   - Interactive overlay layer:
     - Click/drag to place text boxes, checkboxes, or dropdowns.
     - Move and resize placed boxes.
     - Select box to inspect and customize field name, default text, multiline, etc.
   - Auto-Detect Blanks button: automatically scans page text and creates field recommendations.
   - Preview / Test Mode: lets users type into the interactive fields right in the browser!
   - Export Fillable PDF button with client-side file download.

5. **Navigation & Routing Integration**:
   - Register `/tools/form-creator-pdf` in `src/pages/tools/[slug].astro`.
   - Add tool link to `src/components/layout/Footer.astro` under Edit & Sign column.

6. **Build & Quality Verification**:
   - Run Vitest unit tests.
   - Run Astro build (`npm run build`).

7. **Deploy & Dual Audit**:
   - Git commit & push.
   - Deploy to Cloudflare Pages (`airpdf` and `pdfzero`) on `--branch main`.
   - Execute `node scripts/audit_tool.mjs form-creator-pdf`.
