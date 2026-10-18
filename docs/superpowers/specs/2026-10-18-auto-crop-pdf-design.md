# Specification: PDF White Margin Auto-Cropper & Ink Detector (`/tools/auto-crop-pdf`)

## 1. Overview & Value Proposition
Standard PDFs created from Microsoft Word, Google Docs, academic LaTeX papers (arXiv), and scanned books have massive blank white margins (often 1 inch to 1.5 inches / 72–108 points on every side). When viewed on small screens like Kindle, Remarkable 2, Kobo, Onyx Boox, iPad Mini, or smartphones, these margins waste up to 45% of screen real estate, forcing users to constantly pinch, zoom, and pan.

Competitors like Sejda charge $60/yr and limit files to 3 per hour. Adobe Acrobat Pro charges $239/yr and lacks automatic multi-page ink detection. Dedicated desktop tools like k2pdfopt or Briss require technical installation.

**AirPDF Auto-Cropper** brings a 100% in-browser, zero-upload, zero-cost, privacy-first automatic ink scanner that detects non-white content pixels on every page, calculates the ideal bounding box, and sets the native PDF `/CropBox` with zero rasterization.

## 2. Core Technical Architecture

### 2.1 Ink Detection via In-Browser Canvas Analysis
- Render page onto an off-screen HTML5 Canvas using `pdfjs-dist` at a normalized scale (e.g., scale 1.0 or 1.5).
- Read pixel data via `ctx.getImageData(0, 0, width, height)`.
- Pixel evaluation: A pixel `[r, g, b, a]` is considered "ink" if:
  `a > 30` and `(r < threshold || g < threshold || b < threshold)`, where `threshold` is customizable (default: `248` out of 255 to catch subtle lines, light gray text, and watermarks, while ignoring pure or near-white background noise).
- Find:
  - `minX`, `minY` (top-leftmost ink pixel)
  - `maxX`, `maxY` (bottom-rightmost ink pixel)
- Convert canvas pixel coordinates back to 72 DPI PDF point space:
  - `scaleFactor = canvasWidth / pdfPageWidth`
  - Invert Y-axis since PDF coordinates start from bottom-left `(0, 0)` while HTML Canvas starts from top-left `(0, 0)`:
    - `pdfMinX = minX / scaleFactor`
    - `pdfMaxX = maxX / scaleFactor`
    - `pdfMinY = (canvasHeight - maxY) / scaleFactor`
    - `pdfMaxY = (canvasHeight - minY) / scaleFactor`

### 2.2 Crop Modes
1. **Per-Page Auto-Crop**: Each page receives its own independent CropBox tight to its specific ink bounds + user padding.
2. **Uniform Document Auto-Crop** (Default for e-readers):
   - Evaluates sample pages (e.g. up to 20 pages or entire document if <= 50 pages).
   - Computes the union bounding box:
     - `globalMinX = min(minX_i)`
     - `globalMaxX = max(maxX_i)`
     - `globalMinY = min(minY_i)`
     - `globalMaxY = max(maxY_i)`
   - Applies this uniform box to all pages, preventing page bouncing or resizing jitter on e-readers.
3. **Even / Odd Symmetrical Crop**:
   - Computes separate union boxes for even pages (left page: wider outer right margin) and odd pages (right page: wider outer left margin). Perfect for scanned books with binding gutter offsets.

### 2.3 User Configurable Options
- **Padding Margin**:
  - `0 pt` (Tightest possible, 0 mm)
  - `10 pt` (Compact / E-Reader optimized, ~3.5 mm) - Default
  - `20 pt` (Comfortable, ~7 mm)
  - `36 pt` (Half-inch, ~12.7 mm)
- **Ink Sensitivity Threshold**:
  - Normal (detects standard text & graphics, RGB < 248)
  - Aggressive (detects faint watermarks or pencil marks, RGB < 252)
  - Conservative (ignores faint scanner background noise/speckles, RGB < 235)
- **Safety Clamp**:
  - Ensures the crop box never shrinks below 50x50 points and never exceeds the original MediaBox boundaries.

### 2.4 PDF Transformation (pdf-lib)
- Modifies native PDF page box properties:
  - `page.setCropBox(cropX, cropY, cropWidth, cropHeight)`
- Zero rasterization: Vector text, embedded TrueType/OpenType fonts, search index, annotations, and bookmarks remain 100% untouched.
- Output file size remains compact (virtually identical to source).

## 3. UI/UX Flow (`AutoCropPdfIsland.astro`)
1. **Dropzone**: Upload single or multi-page PDF.
2. **Scanning Stage**:
   - Visual progress bar ("Scanning ink density across pages...").
   - Live thumbnail preview of Page 1 with a dynamic glowing green rectangle showing detected ink bounds and dashed outer padding guide.
3. **Control Panel**:
   - Crop Mode Segmented Control: `Uniform Document (E-Reader)` vs `Per-Page Tight` vs `Even/Odd Book`.
   - Margin Slider/Presets: `0 pt (Tight)`, `10 pt (Recommended)`, `20 pt`, `36 pt`.
   - Threshold sensitivity dropdown.
   - Stat Badge: "Detected 32.4% trimmed blank space • E-Reader zoom increased by 1.48×".
4. **Action**:
   - "Download Auto-Cropped PDF" button.
   - Processing time: typically < 1.5 seconds for 20 pages.
