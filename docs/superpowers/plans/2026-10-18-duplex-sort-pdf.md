# Implementation Plan: PDF Manual Duplex Printing Wizard & Reverse Interleaver

## Task Breakdown
1. **Engine Implementation (`src/lib/pdf/duplexSortEngine.ts`)**:
   - `splitForManualDuplex(pdfBytes: Uint8Array, options?: DuplexSplitOptions): Promise<DuplexSplitResult>`
   - `interleavePdfStreams(frontBytes: Uint8Array, backBytes: Uint8Array, options?: InterleaveOptions): Promise<Uint8Array>`
   - Unit helper for blank page generation matching source page dimensions.

2. **Unit Tests (`tests/pdf/duplexSortEngine.test.ts`)**:
   - Test splitting even-count PDF (e.g. 4 pages) into odd (1, 3) and even (2, 4).
   - Test splitting odd-count PDF (e.g. 5 pages) with blank page padding (odd: 1, 3, 5; even: 2, 4, blank).
   - Test reverse even ordering (even: 6, 4, 2).
   - Test interleaving two PDF streams (fronts + backs) in alternating order with reverse option.
   - Run tests (`npm run test`).

3. **Markdown Tool Metadata & SEO (`src/content/tools/duplex-sort-pdf.md`)**:
   - Frontmatter: title, shortDescription, category (`organize`), order: 42, keywords, schema, FAQs.
   - Comprehensive printing guide: front cassette vs rear gravity feed, face-up vs face-down output, paper reinsertion rules.

4. **Interactive UI Island (`src/components/tools/DuplexSortPdfIsland.astro`)**:
   - Mode switcher: "Manual Duplex Print Wizard" vs "Scanner ADF Interleaver".
   - Print Wizard:
     - PDF dropzone.
     - Printer tray configuration (Face-down vs Face-up, Reverse evens toggle).
     - Visual Step 1 (Print Fronts) and Step 2 (Print Backs) cards with individual download buttons.
     - "Download Both (ZIP)" button.
     - Visual paper flip instruction diagram.
   - Scanner Interleaver:
     - Dual dropzones: Drop "Front Sides PDF" & Drop "Back Sides PDF".
     - Reverse Backs toggle (default checked for ADF scanned stacks).
     - 1-Click "Interleave & Merge" button with instant download.

5. **Navigation & Routing Integration**:
   - Register `/tools/duplex-sort-pdf` in `src/pages/tools/[slug].astro`.
   - Add link to `src/components/layout/Footer.astro` under "Organize & Edit" column.

6. **Build & Quality Verification**:
   - Run full Vitest suite.
   - Run `npm run build` to verify 52 static pages build cleanly.

7. **Deploy & Dual Audit**:
   - Git commit & push.
   - Deploy to Cloudflare Pages (`airpdf` and `pdfzero`) on `--branch main`.
   - Run `node scripts/audit_tool.mjs duplex-sort-pdf`.
