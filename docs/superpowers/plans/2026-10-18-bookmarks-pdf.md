# Implementation Plan: PDF Table of Contents (Bookmarks / Outlines) Editor (`/tools/bookmarks-pdf`)

## Phase 1: Core Engine (`src/lib/pdf/bookmarks.ts`)
- Implement `extractBookmarks(pdfBytes: Uint8Array): Promise<BookmarkItem[]>`
- Implement `applyBookmarks(pdfBytes: Uint8Array, bookmarks: BookmarkItem[]): Promise<Uint8Array>`
- Support recursive sibling/child tree construction in `pdf-lib`.
- Set `/PageMode /UseOutlines` on catalog for automatic sidebar opening.

## Phase 2: Unit Testing (`tests/pdf/bookmarks.test.ts`)
- Test 1: Writing flat and nested bookmark hierarchy.
- Test 2: Destination page linking points to exact page reference.
- Test 3: Reading back saved bookmarks from PDF document.

## Phase 3: Content Collection & UI Island
- Add `src/content/tools/bookmarks-pdf.md` with category `'organize'`, icon `'bookmark'`, how-to steps, and FAQs.
- Implement `src/components/tools/BookmarksPdfIsland.astro` with tree editor, add/edit/delete/indent controls, and download button.
- Wire route in `src/pages/tools/[slug].astro` and Footer link in `src/components/layout/Footer.astro`.

## Phase 4: Build, Deploy & Dual Audit
- Run `npm run test` (verify all 16 test suites pass).
- Run `npm run build`.
- Commit and push to git master.
- Deploy to Cloudflare Pages (`airpdf` and `pdfzero`).
- Run Dual Audit (AI security verification + Human UI test).
