# Implementation Plan: PDF Header, Footer & Running Head Inserter (`/tools/header-footer-pdf`)

## Phase 1: Core Engine (`src/lib/pdf/headerFooter.ts`)
- Implement `renderTemplate(template: string, vars: TemplateVars): string`
- Implement `applyHeaderFooter(pdfBytes: Uint8Array, options: HeaderFooterOptions): Promise<HeaderFooterResult>`
- Support 6 anchor slots:
  - `headerLeft`, `headerCenter`, `headerRight`
  - `footerLeft`, `footerCenter`, `footerRight`
- Support options:
  - `fontSize`, `fontFamily`, `colorRgb`, `marginHorizontal`, `marginVertical`
  - `skipFirstPage`, `alternating`

## Phase 2: Unit Testing (`tests/pdf/headerFooter.test.ts`)
- Test 1: Template substitution (`{{page}} of {{total}}`).
- Test 2: Inscribing vector text at 6 coordinate positions.
- Test 3: Skipping first page leaves page 1 un-stamped while stamping remaining pages.
- Test 4: Alternating odd/even layout.

## Phase 3: Content Collection & UI Island
- Add `src/content/tools/header-footer-pdf.md` with category `'organize'`, icon `'layout'`, how-to steps, and FAQs.
- Implement `src/components/tools/HeaderFooterPdfIsland.astro` with 6 input slots, macro helper pills, styling controls, live preview, and download button.
- Wire route in `src/pages/tools/[slug].astro` and Footer link in `src/components/layout/Footer.astro`.

## Phase 4: Build, Deploy & Dual Audit
- Run `npm run test` (verify all 17 test suites pass).
- Run `npm run build`.
- Commit and push to git master.
- Deploy to Cloudflare Pages (`airpdf` and `pdfzero`).
- Run Dual Audit (AI security verification + Human UI test).
