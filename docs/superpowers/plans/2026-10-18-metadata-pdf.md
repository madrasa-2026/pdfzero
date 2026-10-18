# Implementation Plan: PDF Metadata & Title/Author Deep Sanitizer (`/tools/metadata-pdf`)

## Phase 1: Core Engine (`src/lib/pdf/metadata.ts`)
- Define `PdfMetadata` and `UpdateMetadataOptions` interfaces.
- Implement `readPdfMetadata(inputBytes: Uint8Array): Promise<PdfMetadata>`.
- Implement `updatePdfMetadata(inputBytes: Uint8Array, options: UpdateMetadataOptions): Promise<MetadataResult>`.
- Handle XMP stream removal via `doc.catalog.delete(PDFName.of('Metadata'))` and `/PieceInfo` deletion.

## Phase 2: Unit Testing (`tests/pdf/metadata.test.ts`)
- Test 1: Extract and read metadata from an existing PDF with metadata.
- Test 2: Modify Title, Author, and Subject and verify updated properties.
- Test 3: Deep sanitize / anonymize mode (all metadata wiped, XMP deleted, zero identifiers).

## Phase 3: Content Collection & UI Island
- Add `src/content/tools/metadata-pdf.md` (`category: 'security'`, `icon: 'shield'`, `order: 21`).
- Build `src/components/tools/MetadataPdfIsland.astro` (Dropzone, Tag inspector, 1-click anonymize toggle, field editors, live before/after summary, instant download).
- Wire router in `src/pages/tools/[slug].astro` and link in `src/components/layout/Footer.astro`.

## Phase 4: Build, Deploy & Dual Audit
- Run `npm run test` (all 19 test suites).
- Run `npm run build`.
- Commit and push to git master.
- Deploy to Cloudflare Pages (`airpdf` and `pdfzero`).
- Execute Dual Audit (AI code/security + Human UI test) on `https://airpdf.pages.dev/tools/metadata-pdf`.
