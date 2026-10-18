# Specification: PDF Crop & Margin Trimmer (`/tools/crop-pdf`)

## 1. Problem & Competitor Landscape
- **Competitor Lock-in:** Adobe Acrobat Pro, Sejda, and PDF Candy charge $15–$30/month for cropping PDF pages and trimming margins.
- **Free Web Converter Flaws:** Most free web tools re-render pages into lossy JPEG images, destroying selectable text, links, and vector clarity. Cloud tools also leak sensitive documents to remote servers.
- **AirPDF Solution:** 100% in-browser, vector-lossless PDF Crop & Margin Trimmer that modifies PDF `/CropBox` and `/MediaBox` coordinates directly in memory. Zero rasterization, 100% text searchability preserved, and instantaneous download.

## 2. Technical Architecture & Algorithm

### PDF Bounding Box Manipulation (`pdf-lib`)
Each page in a PDF defines bounding boxes in 72 pt/inch coordinates:
- `MediaBox`: Physical medium boundaries `[llx, lly, urx, ury]`.
- `CropBox`: Display boundaries visible in PDF viewers `[llx, lly, urx, ury]`.

Given page dimensions `width` ($W$) and `height` ($H$), and margin trims:
- `trimTop` ($T$)
- `trimBottom` ($B$)
- `trimLeft` ($L$)
- `trimRight` ($R$)

New bounds:
- $X = L$
- $Y = B$
- $\text{New Width} = \max(10, W - L - R)$
- $\text{New Height} = \max(10, H - T - B)$

Set on page:
```ts
page.setCropBox(X, Y, newWidth, newHeight);
page.setMediaBox(X, Y, newWidth, newHeight);
```

### Auto-Trim Whitespace Detection
- Sample page content or analyze text item coordinates using `pdfjs-dist` to find minimum $x, y$ and maximum $x, y$ across text glyphs.
- Auto-calculate tight bounding box with standard padding (e.g. 18 pt).

### Page Scope Selection
- Apply to:
  - All Pages (Default)
  - Odd Pages Only (for books with alternating margins)
  - Even Pages Only
  - Custom Page Range (e.g. `1-5, 8`)

## 3. UI/UX Flow (`CropPdfIsland.astro`)
1. **Dropzone:** File selection with page count and initial dimensions preview.
2. **Crop Controls:**
   - 4 margin inputs (Top, Bottom, Left, Right in pt / mm).
   - Quick Presets:
     - ✂️ Auto-Trim Whitespace
     - 📱 Tablet / Kindle E-Reader (Zero margin crop)
     - ⚖️ Symmetrical Trim (10mm all sides)
     - Custom Margin Sliders
   - Page Range Selector (All Pages, Odd, Even, Custom).
3. **Live Geometry Visualizer:**
   - Visual page mockup box showing the crop rectangle in real-time.
4. **Instant Vector Download:**
   - Saves cropped PDF with `-cropped.pdf` suffix with 100% vector typography intact.

## 4. Verification & Testing Strategy
- Unit tests in `tests/pdf/crop.test.ts`:
  - Verify mathematical crop box coordinates calculation.
  - Verify application to multi-page document with odd/even page filters.
  - Verify invalid/negative margins handling.
- Dual Audit:
  - Code/Security: Vitest, zero external requests.
  - Human UX: Dropzone, responsive margin sliders, live visualizer, download action, SEO/FAQ verification.
