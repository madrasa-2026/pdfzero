# Implementation Plan: PDF DPI Downsampler & Image Compression Tuner (`/tools/downsample-pdf`)

## Phase 1: Core Downsampler Engine (`src/lib/pdf/downsampler.ts`)
- Define `DownsampleOptions`:
  - `targetDpi: number` (e.g. 72, 150, 300)
  - `jpegQuality: number` (0.4 to 0.95)
  - `onlyIfSmaller?: boolean` (default: true, never increase file size)
- Define `ImageInspectionItem`:
  - `ref: string`, `width: number`, `height: number`, `effectiveDpi: number`, `format: string`, `originalBytesLength: number`, `newBytesLength?: number`.
- Define `DownsampleResult`:
  - `pdfBytes: Uint8Array`, `originalSize: number`, `outputSize: number`, `imagesDownsampled: number`, `savedBytes: number`, `details: ImageInspectionItem[]`.
- Implement image extraction and XObject scanner using `pdf-lib`.
- Implement downsample resizing function with canvas / Node buffer fallback.
- Implement `downsamplePdfImages(pdfBytes: Uint8Array, options?: DownsampleOptions): Promise<DownsampleResult>`.

## Phase 2: Unit Testing (`tests/pdf/downsampler.test.ts`)
- Test 1: Identifies embedded image XObjects and calculates effective display DPI.
- Test 2: Downsamples a high-DPI image (e.g., 600 DPI down to 150 DPI or 72 DPI).
- Test 3: Replaces XObject stream and updates `/Width` and `/Height` without altering vector text.
- Test 4: Preserves documents with zero images or already low-DPI images cleanly.
- Test 5: Verify output PDF loads cleanly in `pdf-lib` without corruption.

## Phase 3: Content Collection & UI Island
- Create `src/content/tools/downsample-pdf.md` (`category: 'optimize'`, `icon: 'wrench'`).
- Build `src/components/tools/DownsamplePdfIsland.astro` (Dropzone, preset cards: 'Screen 72 DPI', 'Office 150 DPI', 'Archive 300 DPI', custom slider, before/after size & reduction percentage badge, instant download).
- Wire router switch in `src/pages/tools/[slug].astro`.
- Update `Footer.astro` (Optimize column), `Header.astro` counter (now 37 tools), and `index.astro`.

## Phase 4: Build, Deploy & Dual Audit
- Run `npm run test` (confirm 30 test suites pass).
- Run `npm run build` (confirm 42 static routes generated cleanly).
- Commit & push to master.
- Deploy to Cloudflare Pages (`airpdf` and `pdfzero`) on branch `main`.
- Execute Dual Audit (AI code/security + Human UI verification) on `https://airpdf.pages.dev/tools/downsample-pdf`.
