# Implementation Plan: PDF Color Inverter & Dark Mode Creator (`/tools/dark-mode-pdf`)

## Phase 1: Core Engine (`src/lib/pdf/darkMode.ts`)
- Define theme structures: `DarkModeTheme` ('midnight' | 'sepia' | 'oled' | 'solarized').
- Implement `transformRgbForTheme(r, g, b, theme): [number, number, number]`.
- Implement `transformGrayForTheme(gray, theme): number`.
- Implement `prependPageBackground(doc, page, bgR, bgG, bgB): void`.
- Implement `transformContentStreamForDarkMode(content, theme): { newContent: string; opsCount: number }`.
- Implement `invertImageXObjects(doc, page): number`.
- Implement `convertPdfToDarkMode(pdfBytes, options): Promise<DarkModeResult>`.

## Phase 2: Unit Testing (`tests/pdf/darkMode.test.ts`)
- Test 1: Color transformation math for Midnight, Sepia, OLED, and Solarized themes.
- Test 2: Content stream rewriting converts black text to light foreground and white boxes to dark background.
- Test 3: Background stream prepending and end-to-end PDF generation with `pdf-lib`.

## Phase 3: Content Collection & UI Island
- Create `src/content/tools/dark-mode-pdf.md` (`category: 'convert'`, `icon: 'moon'`).
- Build `src/components/tools/DarkModePdfIsland.astro` (Dropzone, theme selector cards with visual previews, mode toggles, progress indicator, download button).
- Wire router in `src/pages/tools/[slug].astro` and Footer link in `src/components/layout/Footer.astro`.

## Phase 4: Build, Deploy & Dual Audit
- Run `npm run test` (confirm 24 test suites pass).
- Run `npm run build` (confirm 36 static pages generated).
- Commit & push to master.
- Deploy to Cloudflare Pages (`airpdf` and `pdfzero`).
- Execute Dual Audit (AI code/security + Human UI test) on `https://airpdf.pages.dev/tools/dark-mode-pdf`.
