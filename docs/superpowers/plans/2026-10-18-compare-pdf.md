# Implementation Plan: Side-by-Side Visual & Text PDF Diff Comparator (`/tools/compare-pdf`)

## Phase 1: Core Diff Engine (`src/lib/pdf/compare.ts`)
- Implement `computeWordDiff(textA: string, textB: string): DiffToken[]`
- Implement `comparePdfTextPages(docA: PDFDocumentProxy, docB: PDFDocumentProxy): Promise<PageDiffResult[]>`
- Calculate similarity index: `diceCoefficient(tokensA, tokensB)` or `(2 * common) / (totalA + totalB)`.
- Support options: `ignoreCase`, `ignoreWhitespace`.

## Phase 2: Unit Testing (`tests/pdf/compare.test.ts`)
- Test 1: Word diff calculation for additions, deletions, replacements.
- Test 2: Similarity index calculation (identical = 100%, completely disjoint = 0%).
- Test 3: Multi-line and paragraph level diff grouping.

## Phase 3: Content Collection & UI Island
- Add `src/content/tools/compare-pdf.md` with category `'organize'`, icon `'columns'`, how-to steps, and FAQs.
- Implement `src/components/tools/ComparePdfIsland.astro` with dual file dropzones (Doc A & Doc B), page switcher, synchronized split-view diff reader, and change stats summary.
- Wire route in `src/pages/tools/[slug].astro` and Footer link in `src/components/layout/Footer.astro`.

## Phase 4: Build, Deploy & Dual Audit
- Run `npm run test` (verify all 14 test suites pass).
- Run `npm run build`.
- Commit and push to git master.
- Deploy to Cloudflare Pages (`airpdf` and `pdfzero`).
- Run Dual Audit (AI security verification + Human UI test).
