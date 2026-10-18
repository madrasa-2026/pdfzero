# Specification: In-Browser PDF Page Resizer & Margin Expander (`/tools/resize-pdf`)

## 1. Problem & Competitor Landscape
- **Competitor Lock-in:** Adobe Acrobat Pro, Sejda, and PDF24 charge $15–$25/month for changing paper sizes, converting between Letter and A4, or expanding page margins.
- **The Core Problem:** International collaboration frequently encounters paper size mismatches. US Letter documents printed on A4 paper get clipped, and legal briefs prepared for 3-hole punch binders lack sufficient gutter margin. Web converters typically rasterize pages into blurry images, destroying text searchability.
- **AirPDF Solution:** 100% in-browser, vector-lossless PDF Page Resizer and Canvas Expander that scales or embeds pages onto target standard paper dimensions (A4, Letter, Legal, A3, A5, Tabloid) with custom margin padding, alignment, and zero server uploads.

## 2. Technical Architecture & Algorithm

### Target Dimension Profiles (Points: 72 pt = 1 in)
- `A4`: $595.28 \times 841.89$ pt
- `Letter`: $612 \times 792$ pt
- `Legal`: $612 \times 1008$ pt
- `A3`: $841.89 \times 1190.55$ pt
- `A5`: $419.53 \times 595.28$ pt
- `Tabloid`: $792 \times 1224$ pt
- `Custom`: User-defined width and height

### Scaling & Positioning Mathematics
Given source page dimensions $(w_s, h_s)$ and target canvas dimensions $(w_t, h_t)$:
1. **Fit & Scale Mode (Proportional):**
   - Scale factor $s = \min((w_t - 2 \cdot \text{margin}) / w_s, (h_t - 2 \cdot \text{margin}) / h_s)$
   - Scaled width $w = w_s \cdot s$, Scaled height $h = h_s \cdot s$
   - Centered offsets:
     - $x = (w_t - w) / 2$
     - $y = (h_t - h) / 2$
   - Draw embedded page: `sheet.drawPage(emb, { x, y, width: w, height: h })`
2. **Expand Canvas Mode (No Scaling):**
   - $s = 1.0$, $w = w_s$, $h = h_s$
   - Target dimensions $w_t = w_s + \text{extraWidth}$, $h_t = h_s + \text{extraHeight}$
   - Centered or custom alignment (e.g. shift right for 3-hole binder gutter).

### Vector Preservation
- Uses `destDoc.embedPdf(srcDoc, srcDoc.getPageIndices())` and draws embedded vector form XObjects.
- Preserves all fonts, vectors, high-res photos, and metadata without rasterization.

## 3. UI/UX Flow (`ResizePdfIsland.astro`)
1. **Dropzone:** File selection with detected paper format and page count.
2. **Configuration Controls:**
   - Target Size Preset: A4, US Letter, US Legal, A3, A5, Tabloid, Custom.
   - Resize Strategy:
     - 🔍 Proportional Scale to Fit (No clipping, centered)
     - 📐 Expand Canvas Margins (+Padding for binding or notes)
   - Margin Offset (pt / mm).
   - Orientation: Auto (matches source), Portrait, Landscape.
3. **Live Geometry Visualizer:**
   - Visual mock preview showing original vs target paper boundary.
4. **Instant Vector Download:**
   - Download resized PDF with `-resized.pdf` suffix with 100% vector typography intact.

## 4. Verification & Testing Strategy
- Unit tests in `tests/pdf/resize.test.ts`:
  - Verify Letter to A4 scale factor and centering coordinates.
  - Verify canvas expander with margin gutter padding.
  - Verify multi-page document resizing preserves page count and embedded vectors.
- Dual Audit:
  - Code/Security: Vitest, zero external requests.
  - Human UX: Dropzone, format selector, strategy toggle, live visualizer, download action, SEO/FAQ verification.
