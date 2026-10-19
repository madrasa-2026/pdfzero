# Implementation Plan: PDF Invisible OCR Text Layer Stripper & Decoupler

## Task Breakdown
1. **Engine Implementation (`src/lib/pdf/stripOcrEngine.ts`)**:
   - `stripOcrLayer(pdfBytes: Uint8Array, options?: StripOcrOptions): Promise<StripOcrResult>`
   - Stream content parser identifying `BT ... ET` blocks and `3 Tr` rendering operators.
   - Stream re-assembler updating page `/Contents` dictionaries cleanly without corrupting other drawing operators (`Do`, `re`, `cm`, etc.).

2. **Unit Tests (`tests/pdf/stripOcrEngine.test.ts`)**:
   - Test stripping `3 Tr` invisible text blocks from synthesized stream.
   - Test preserving visible text (`0 Tr` or normal `BT ... ET`) when mode is `invisible-only`.
   - Test stripping all text blocks when mode is `all-text`.
   - Test preservation of page count, geometry, and image XObjects.

3. **Markdown Tool Metadata & SEO (`src/content/tools/strip-ocr-pdf.md`)**:
   - Frontmatter: title, description, category (`optimize`), order: 43, keywords, schema, FAQs.
   - Deep-dive technical explanation of PDF render mode 3 (`3 Tr`), OCR misalignment, and non-rasterizing vector sanitization.

4. **Interactive UI Island (`src/components/tools/StripOcrPdfIsland.astro`)**:
   - Dropzone with drag & drop and instant client-side scan.
   - Radio selector for Mode (Invisible OCR Only vs All Text).
   - Live stream inspection readout: pages analyzed, invisible OCR blocks stripped.
   - Download Sanitized PDF button.

5. **Navigation & Routing Integration**:
   - Register `/tools/strip-ocr-pdf` in `src/pages/tools/[slug].astro`.
   - Add link to `src/components/layout/Footer.astro` under "Optimize & Repair".

6. **Build & Quality Verification**:
   - Run Vitest suite (`npm run test`).
   - Run Astro build (`npm run build`).

7. **Deploy & Dual Audit**:
   - Git commit & push.
   - Deploy to Cloudflare Pages (`airpdf` and `pdfzero`) on `--branch main`.
   - Run `node scripts/audit_tool.mjs strip-ocr-pdf`.
