# Implementation Plan: PDF Poster Maker & Multi-Sheet Tiler (`/tools/poster-pdf`)

## Phase 1: Core Poster Engine Implementation (`src/lib/pdf/posterEngine.ts`)
- Define `PosterPaperSize = 'a4' | 'letter' | 'a3'`.
- Define `PosterOptions` interface:
  - `columns: number` (1 to 10)
  - `rows: number` (1 to 10)
  - `paperSize: PosterPaperSize`
  - `overlap: number` (points, default: 36)
  - `showCutLines: boolean` (default: true)
  - `showTileNumbers: boolean` (default: true)
  - `pageIndex?: number` (which page to tile, default: 0)
- Define `PosterResult` interface:
  - `pdfBytes: Uint8Array`
  - `originalSize: number`
  - `outputSize: number`
  - `totalSheets: number`
  - `posterDimensionsPt: { width: number; height: number }`
  - `posterDimensionsMm: { width: number; height: number }`
  - `posterDimensionsInches: { width: number; height: number }`
- Implement `tilePosterPdf(pdfBytes: Uint8Array, options?: PosterOptions): Promise<PosterResult>`.

## Phase 2: Unit Testing (`tests/pdf/posterEngine.test.ts`)
- Test 1: Tiles a single page across a 2x2 grid (4 sheets).
- Test 2: Accurately calculates total assembled physical poster dimensions (points, mm, inches).
- Test 3: Overlap margin creates proper subpage offset shifts.
- Test 4: Handles 3x3 (9 sheets) and asymmetrical 3x2 grids.
- Test 5: Embeds Form XObjects without corrupting vector text.

## Phase 3: Content Collection & UI Island
- Create `src/content/tools/poster-pdf.md` (`category: 'organize'`, `icon: 'layout'`).
- Build `src/components/tools/PosterPdfIsland.astro` (Dropzone, Quick Presets: 2x2 [4 sheets], 3x3 [9 sheets], 4x4 [16 sheets], custom row/col stepper, paper size selector, overlap slider, live physical dimensions display, instant download).
- Wire router switch in `src/pages/tools/[slug].astro`.
- Update `Footer.astro` (Organize column), `Header.astro` counter (now 39 tools), and `index.astro`.

## Phase 4: Build, Deploy & Dual Audit
- Run `npm run test` (confirm 32 test suites pass).
- Run `npm run build` (confirm 44 static routes generated cleanly).
- Commit & push to master.
- Deploy to Cloudflare Pages (`airpdf` and `pdfzero`) on branch `main`.
- Execute Dual Audit (AI code/security + Human UI verification) on `https://airpdf.pages.dev/tools/poster-pdf`.
