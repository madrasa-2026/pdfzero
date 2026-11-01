# Implementation Plan: PDF to PDF/A ISO Archival Converter

## Task Breakdown
1. **Engine Implementation (`src/lib/pdf/pdfaEngine.ts`)**:
   - `convertToPdfA(pdfBytes: Uint8Array, options?: PdfAOptions): Promise<PdfAResult>`
   - Implement `generatePdfaXmp(options: { part: number, conformance: string, title?: string, author?: string })`
   - Implement `injectOutputIntent(doc: PDFDocument, part: number)`
   - Sanitize disallowed PDF/A launch actions and check encryption.

2. **Unit Tests (`tests/pdf/pdfaEngine.test.ts`)**:
   - Test PDF/A-1b conversion (verifies OutputIntent, GTS_PDFA1, XMP pdfaid:part 1).
   - Test PDF/A-2b conversion (verifies OutputIntent, GTS_PDFA2, XMP pdfaid:part 2).
   - Test PDF/A-3b conversion (verifies OutputIntent, GTS_PDFA3, XMP pdfaid:part 3).
   - Test preserving multi-page geometry and text.
   - Run tests (`npm run test`).

3. **Markdown Tool Metadata & SEO (`src/content/tools/pdf-to-pdfa.md`)**:
   - Frontmatter: title, description, category (`optimize`), order: 44, keywords, schema, FAQs.
   - In-depth guide explaining PDF/A ISO 19005 standards, PACER/court compliance, sRGB color spaces, and XMP metadata vs standard PDF.

4. **Interactive UI Island (`src/components/tools/PdfToPdfaIsland.astro`)**:
   - Dropzone with drag & drop and PDF validation.
   - Profile selector radio buttons (PDF/A-2b, PDF/A-1b, PDF/A-3b).
   - Optional title and author inputs for Dublin Core metadata.
   - ISO Compliance Checklist with green checkmarks.
   - Download ISO Compliant PDF/A button.

5. **Navigation & Routing Integration**:
   - Register `/tools/pdf-to-pdfa` in `src/pages/tools/[slug].astro`.
   - Add link to `src/components/layout/Footer.astro` under "Optimize & Repair".

6. **Build & Quality Verification**:
   - Run Vitest suite (`npm run test`).
   - Run Astro build & sitemap sync (`npm run build`).

7. **Deploy & Dual Audit**:
   - Git commit & push.
   - Deploy to Cloudflare Pages (`airpdf` and `pdfzero`) on `--branch main`.
   - Run `node scripts/audit_tool.mjs pdf-to-pdfa`.
