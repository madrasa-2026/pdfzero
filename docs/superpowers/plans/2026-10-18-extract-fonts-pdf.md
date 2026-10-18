# Implementation Plan: PDF Embedded Font Extractor & TTF Ripper

## Task Breakdown
1. **Engine Implementation (`src/lib/pdf/fontExtractorEngine.ts`)**:
   - `extractEmbeddedFonts(pdfBytes: Uint8Array): Promise<FontExtractionResult>`
   - `createFontsZip(fonts: ExtractedFont[], originalPdfName?: string): Promise<Uint8Array>`
   - Helper functions: subset tag parser, magic byte detector, human-readable size formatter.

2. **Unit Tests (`tests/pdf/fontExtractorEngine.test.ts`)**:
   - Test font descriptor extraction with TrueType stream.
   - Test OpenType / OTTO stream detection.
   - Test subset tag stripping (`ABCDEF+Roboto-Bold` -> `Roboto-Bold`).
   - Test ZIP archive bundling.
   - Run tests (`npm run test`).

3. **Markdown Tool Metadata & SEO (`src/content/tools/extract-fonts-pdf.md`)**:
   - Frontmatter: title, shortDescription, category (`optimize`), order: 41, keywords, schema, FAQs.
   - Content: In-depth technical breakdown of PDF font embedding dictionaries (`/FontDescriptor`, `/FontFile2`, `/FontFile3`, CFF vs TrueType).

4. **Interactive UI Island (`src/components/tools/ExtractFontsPdfIsland.astro`)**:
   - Dropzone with drag & drop and file picker.
   - Loading indicator with extraction progress.
   - Typography Specimen Gallery:
     - Font cards showing Clean Family Name, Subtype, Format (.TTF / .OTF / .CFF), File Size, and Subset status.
     - Dynamic `@font-face` blob injection for live in-browser preview of custom glyphs.
     - Editable specimen input ("Sphinx of black quartz, judge my vow").
     - Single-click individual "Download Font" button.
     - "Download All as ZIP" master button with icon and counter.
     - Empty state / fallback notification if no embedded font binaries exist (e.g. system standard 14 fonts).

5. **Navigation & Routing Integration**:
   - Register `/tools/extract-fonts-pdf` in `src/pages/tools/[slug].astro`.
   - Add link to `src/components/layout/Footer.astro` under "Optimize & Repair" column.

6. **Build & Quality Verification**:
   - Run full Vitest suite.
   - Run `npm run build` to verify 51 static pages build cleanly.

7. **Deploy & Dual Audit**:
   - Git commit & push.
   - Deploy to Cloudflare Pages (`airpdf` and `pdfzero`) on `--branch main`.
   - Run `node scripts/audit_tool.mjs extract-fonts-pdf`.
