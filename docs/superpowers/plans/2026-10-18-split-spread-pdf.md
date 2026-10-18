# Implementation Plan: PDF Split in Half / Two-Page Spread Cutter (`/tools/split-spread-pdf`)

## Phase 1: Core Spread Splitter Engine (`src/lib/pdf/splitSpread.ts`)
- Define `SplitDirection = 'vertical' | 'horizontal'`.
- Define `ReadingDirection = 'ltr' | 'rtl'`.
- Define `CoverHandling = 'all' | 'skip-first' | 'skip-first-and-last'`.
- Define `SpreadSplitOptions` interface.
- Define `SpreadSplitResult` interface.
- Implement `splitSpreadPdf(pdfBytes: Uint8Array, options?: SpreadSplitOptions): Promise<SpreadSplitResult>`.

## Phase 2: Unit Testing (`tests/pdf/splitSpread.test.ts`)
- Test 1: Splits 2-page landscape document into 4 portrait pages (LTR order).
- Test 2: RTL reading order swaps page emission (Right page then Left page for Manga).
- Test 3: Horizontal split cuts top and bottom halves cleanly.
- Test 4: `skip-first` preserves Page 1 as single cover and splits remaining pages.
- Test 5: Spine gutter excludes central binding seam width.

## Phase 3: Content Collection & UI Island
- Create `src/content/tools/split-spread-pdf.md` (`category: 'organize'`, `icon: 'columns'`).
- Build `src/components/tools/SplitSpreadPdfIsland.astro` (Dropzone, Split direction toggle, Reading direction toggle, Cover handling selector, Spine gutter slider, Page count forecast, instant download).
- Wire router switch in `src/pages/tools/[slug].astro`.
- Update `Footer.astro` (Organize column), `Header.astro` counter (now 38 tools), and `index.astro`.

## Phase 4: Build, Deploy & Dual Audit
- Run `npm run test` (confirm 31 test suites pass).
- Run `npm run build` (confirm 43 static routes generated cleanly).
- Commit & push to master.
- Deploy to Cloudflare Pages (`airpdf` and `pdfzero`) on branch `main`.
- Execute Dual Audit (AI code/security + Human UI verification) on `https://airpdf.pages.dev/tools/split-spread-pdf`.
