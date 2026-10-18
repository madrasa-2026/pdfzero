# Implementation Plan: PDF Forensic X-Ray & Deep Object Inspector (`/tools/inspect-pdf`)

## Phase 1: Pure Engine (`src/lib/pdf/inspectEngine.ts`)
1. Create `inspectPdfDocument(pdfBytes: Uint8Array): Promise<PdfInspectionReport>`.
2. Binary signature parsing:
   - PDF Header version (e.g., `%PDF-1.7`).
   - Incremental revision count by counting matches for `%%EOF` / `startxref`.
3. Low-level object traversal via `doc.context.enumerateIndirectObjects()`:
   - Identify font objects (`/Type /Font`), extract `/BaseFont`, `/Subtype`, subset prefix detection (`^[A-Z]{6}\+`).
   - Identify image objects (`/Type /XObject`, `/Subtype /Image`), extract `/Width`, `/Height`, `/ColorSpace`, `/Filter`, `/BitsPerComponent`.
   - Security scanning:
     - Check Root Catalog for `/Names -> /JavaScript` or `/OpenAction`.
     - Check objects for `/JS`, `/JavaScript`, `/Launch`, `/EmbeddedFiles`.
     - Check for `/AcroForm` and digital signature fields (`/Sig`).
4. Page 1 Content Stream Decompression:
   - Locate Page 1 `/Contents`.
   - Decompress stream bytes (handling `PDFRawStream` decode) and convert to readable ASCII/UTF-8 operator text.
5. Return structured, serializable `PdfInspectionReport`.

## Phase 2: Unit Testing (`tests/pdf/inspectEngine.test.ts`)
1. Test PDF header version and revision count extraction.
2. Test font detection and subset identification on sample `PDFDocument`.
3. Test image XObject detection with color space and filter.
4. Test security scanning: flags JavaScript or launch action when present, reports safe when clean.
5. Test content stream decompression: returns valid PDF drawing operators (`BT ... ET`, `Tf`, `Tj`).

## Phase 3: Content Collection Entry (`src/content/tools/inspect-pdf.md`)
- Title: "PDF Forensic Inspector — Deep Object X-Ray & Preflight Analyzer"
- Slug: `inspect-pdf`
- Category: `security` (or `optimize`)
- Icon: `search` (or `shield`)
- How-to steps and 6 detailed FAQs.

## Phase 4: UI Island (`src/components/tools/InspectPdfIsland.astro`)
- Sleek dark forensic terminal aesthetic with emerald/cyan accent glows.
- Tabbed interface:
  - Tab 1: Security & Forensic Audit (Revision count, Active content flags, Encryption).
  - Tab 2: Fonts & Images Prepress (Font table, Image color space CMYK/RGB check).
  - Tab 3: Raw Content Stream Decompressor (Live viewer with syntax highlighting and copy button).
  - Tab 4: Raw JSON Export (Download forensic diagnostic report).

## Phase 5: Routing, Build, Deploy, and Dual Audit
- Add island to `src/pages/tools/[slug].astro`.
- Add link to `src/components/layout/Footer.astro` under Security & Convert.
- Run tests (`npm run test`).
- Run build (`npm run build`).
- Git commit & push.
- Cloudflare Pages deploy (`airpdf` and `pdfzero`) on `main`.
- Dual Audit.
