# Implementation Plan: PDF Page Overlay & Letterhead Stamper (`/tools/overlay-pdf`)

## Phase 1: Core Engine (`src/lib/pdf/overlay.ts`)
- Define `OverlayLayerType` ('underlay' | 'overlay').
- Define `OverlayPageTarget` ('all' | 'first' | 'odd' | 'even' | 'custom').
- Define `OverlayOptions` and `OverlayResult`.
- Implement page index parser `resolveTargetPageIndices(totalTargetPages, target, customRange): number[]`.
- Implement bounds calculator for `fit` and `center` scaling.
- Implement `applyPdfOverlay(targetPdfBytes, templatePdfBytes, options): Promise<OverlayResult>`.

## Phase 2: Unit Testing (`tests/pdf/overlay.test.ts`)
- Test 1: Page index resolution for `all`, `first`, `odd`, `even`, and custom ranges.
- Test 2: Overlay compositing on top of target pages with opacity.
- Test 3: Underlay compositing behind target pages (letterhead mode).

## Phase 3: Content Collection & UI Island
- Create `src/content/tools/overlay-pdf.md` (`category: 'edit'`, `icon: 'layers'`).
- Build `src/components/tools/OverlayPdfIsland.astro` (Dual file selector: Document + Overlay Template, Layer toggle: Background vs Foreground, Opacity slider, Page targeting radios, Download button).
- Wire router in `src/pages/tools/[slug].astro` and Footer link in `src/components/layout/Footer.astro`.

## Phase 4: Build, Deploy & Dual Audit
- Run `npm run test` (confirm 25 test suites pass).
- Run `npm run build` (confirm 37 static pages generated).
- Commit & push to master.
- Deploy to Cloudflare Pages (`airpdf` and `pdfzero`).
- Execute Dual Audit (AI code/security + Human UI test) on `https://airpdf.pages.dev/tools/overlay-pdf`.
