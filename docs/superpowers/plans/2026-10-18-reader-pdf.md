# Implementation Plan: In-Browser Text-to-Speech (TTS) PDF Audio Reader (`/tools/reader-pdf`)

## Phase 1: Core Engine (`src/lib/pdf/reader.ts`)
- Define `ReaderSentence`, `PageTextGroup`, and `ReaderOptions`.
- Implement `cleanPdfText(rawText: string): string` (de-hyphenation, newline normalization).
- Implement `segmentIntoSentences(text: string, pageNumber: number): ReaderSentence[]`.
- Implement text extraction and sentence builder from `pdfjs-dist` pages.

## Phase 2: Unit Testing (`tests/pdf/reader.test.ts`)
- Test 1: Text cleaning and de-hyphenation across line breaks.
- Test 2: Sentence segmentation handling punctuation, abbreviations, and ellipses.
- Test 3: Page grouping and sequential sentence indexing.

## Phase 3: Content Collection & UI Island
- Add `src/content/tools/reader-pdf.md` (`category: 'convert'`, `icon: 'volume-2'`, `order: 25`).
- Build `src/components/tools/ReaderPdfIsland.astro` (Dropzone, sticky audio controls dock with speed/voice selectors, reader canvas with synchronized live sentence highlighting, click-to-read).
- Wire router in `src/pages/tools/[slug].astro` and Footer link in `src/components/layout/Footer.astro`.

## Phase 4: Build, Deploy & Dual Audit
- Run `npm run test` (all 23 test suites).
- Run `npm run build`.
- Commit and push to git master.
- Deploy to Cloudflare Pages (`airpdf` and `pdfzero`).
- Execute Dual Audit (AI code/security + Human UI test) on `https://airpdf.pages.dev/tools/reader-pdf`.
