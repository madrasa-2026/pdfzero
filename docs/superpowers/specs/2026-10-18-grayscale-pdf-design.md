# Specification: PDF Grayscale & Ink Saver Converter (`/tools/grayscale-pdf`)

## 1. Problem & Competitor Landscape
- **Competitor Lock-in:** Adobe Acrobat Pro, Sejda, and Smallpdf charge $15–$30/month for "Convert to Grayscale" or "Preflight Print Optimization".
- **Free Cloud Flaws:** Cloud tools upload confidential contracts, medical scans, or blueprints to remote servers, and frequently rasterize vector text into blurry low-DPI JPEG images, destroying text selection and searchability.
- **AirPDF Solution:** 100% client-side Grayscale & Ink-Saver engine that converts color vector content streams (`rg`/`RG` to `g`/`G`) and desaturates embedded images to `/DeviceGray` in browser memory, preserving 100% vector text and sharpness.

## 2. Technical Architecture & Algorithm

### Vector Stream Desaturation
In PDF content streams:
- `r g b rg` sets the non-stroking color in DeviceRGB.
- `r g b RG` sets the stroking color in DeviceRGB.
- `c m y k k` and `c m y k K` set DeviceCMYK colors.
- `gray g` and `gray G` set DeviceGray.

Standard luminance conversion formula:
`Luminance Y = 0.299 * R + 0.587 * G + 0.114 * B`

For content streams:
- Uncompress streams if compressed (`doc.context.lookup(page.node.get(PDFName.of('Contents')))`).
- Replace `r g b rg` regex matches with `Y.toFixed(3) + ' g'`.
- Replace `r g b RG` regex matches with `Y.toFixed(3) + ' G'`.
- Replace `c m y k k` regex matches where `gray = 1 - Math.min(1, 0.299*c + 0.587*m + 0.114*y + k)` with `gray.toFixed(3) + ' g'`.

### Image XObject Desaturation
Pages contain `/Resources /XObject` dictionaries:
- For image XObjects with `/ColorSpace /DeviceRGB`:
  - When in browser runtime with Canvas / OffscreenCanvas: convert RGB pixel data to grayscale luminance.
  - Or update the `/ColorSpace` to `/DeviceGray` and convert raw uncompressed byte buffers, or replace with desaturated image stream.
  - For maximum reliability and cross-environment compatibility (Node vitest + browser):
    - Update ColorSpace mapping and apply stream filter transformation.
    - Provide an ink-saver brightness/contrast boost curve option:
      - Normal Grayscale (Gamma 1.0)
      - Ink Saver / Eco (Lighten grays by +15% to save printer toner/ink)
      - High Contrast B&W (Thresholding for crisp text and photocopies)

### Security & Privacy Guarantee
- 100% in-browser memory. Zero external API calls, zero telemetry, zero server uploads.

## 3. UI/UX Flow (`GrayscalePdfIsland.astro`)
1. **Dropzone:** File selection with page count, file size, and color indicator badge.
2. **Optimization Mode Selector:**
   - 🎨 Standard Grayscale (Balanced tonal range for documents and photos)
   - 🖨️ Eco Ink Saver (Lightens dark fills by 15% to conserve printer toner and ink)
   - 📄 High Contrast B&W (Enhances faded scans and photocopied text)
3. **Live Comparison / Conversion Status:**
   - Visual progress indicator.
   - Page count and compression metrics.
4. **Instant Vector Download:**
   - One-click instant download with clean suffix `-grayscale.pdf`.

## 4. Verification & Testing Strategy
- Unit tests in `tests/pdf/grayscale.test.ts`:
  - Verify vector stream color operator conversion (`rg` -> `g`, `RG` -> `G`).
  - Verify CMYK operator conversion (`k`/`K` -> `g`/`G`).
  - Verify document structure and page integrity remain valid after transformation.
  - Verify Eco Ink Saver mode calculations.
- Dual Audit:
  - Code/Security: Vitest suite, zero network leaks.
  - Human UX: Dropzone, options selector, progress state, download action, SEO/FAQ verification.
