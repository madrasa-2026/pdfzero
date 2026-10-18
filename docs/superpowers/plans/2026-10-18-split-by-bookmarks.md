# Implementation Plan: PDF Split by Bookmarks / Chapters (`/tools/split-by-bookmarks`)

## Phase 1: Core Engine (`src/lib/pdf/splitBookmarks.ts`)
- Define `ChapterSplitItem`, `SplitByBookmarksOptions`, and `SplitByBookmarksResult`.
- Implement `calculateChapterRanges(bookmarks: BookmarkItem[], totalPages: number): ChapterSplitItem[]`.
- Implement `splitPdfByBookmarks(inputBytes: Uint8Array, options?: SplitByBookmarksOptions): Promise<SplitByBookmarksResult>`.
- Generate chapter PDFs and bundle with `JSZip`.

## Phase 2: Unit Testing (`tests/pdf/splitBookmarks.test.ts`)
- Test 1: Calculate chapter ranges from linear bookmark tree (e.g. pages 1, 10, 25 in 50-page doc).
- Test 2: Handle front-matter gap before first bookmark (pages 1–4 when first bookmark is at page 5).
- Test 3: Extract chapter PDFs and generate valid ZIP buffer with correct filenames.

## Phase 3: Content Collection & UI Island
- Add `src/content/tools/split-by-bookmarks.md` (`category: 'organize'`, `icon: 'layers'`, `order: 23`).
- Build `src/components/tools/SplitByBookmarksIsland.astro` (Dropzone, chapter timeline, select/deselect checkboxes, individual and bulk ZIP downloads).
- Wire router in `src/pages/tools/[slug].astro` and Footer link in `src/components/layout/Footer.astro`.

## Phase 4: Build, Deploy & Dual Audit
- Run `npm run test` (all 21 test suites).
- Run `npm run build`.
- Commit and push to git master.
- Deploy to Cloudflare Pages (`airpdf` and `pdfzero`).
- Execute Dual Audit (AI code/security + Human UI test) on `https://airpdf.pages.dev/tools/split-by-bookmarks`.
