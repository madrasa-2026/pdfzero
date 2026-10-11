# Design Specification: AirPDF Client-Side Edit PDF Tool (`/tools/edit-pdf`)

**Document Date:** 2026-10-11  
**Status:** Validated Design Spec  
**Target Module:** `src/lib/pdf/edit.ts`, `src/components/tools/EditPdfIsland.astro`, `src/content/tools/edit-pdf.md`

---

## 1. Executive Summary & Goals

The **Edit PDF** tool allows users to perform visual annotations, add customizable text (including native Bengali/বাংলা script), draw vector signatures and pen markings, apply visual whiteout blocks, and manage page order/rotations directly within their web browser.

In strict alignment with AirPDF's core engineering principles:
* **Zero Server Uploads**: 100% client-side execution powered by WebAssembly (`pdfjs-dist`) and JavaScript (`pdf-lib` + `@pdf-lib/fontkit`).
* **Non-Destructive Vector Architecture**: Underlying page streams, vector text, original formatting, and fonts are preserved. All new annotations are written using native PDF vector operators—never rasterized into image layers.
* **Honest Disclosures**: Whiteout is explicitly demarcated as a visual cover-up, with visible warnings clarifying that underlying text remains extractable in the raw file stream.
* **Multilingual Typography**: Native support for Bengali (বাংলা) Unicode rendering via embedded fontkit TTF.

---

## 2. Feature Scope & Architecture

### 2.1 Editor Workbench Interface (`EditPdfIsland.astro`)

The workspace is organized into a clean, desktop-grade two-panel utility layout:

```
+---------------------------------------------------------------------------------------------------+
|  [Select] [Text "T"] [Whiteout ▭] [Pen ✎] [Highlight ░] [Undo ↶] [Zoom -/+]      [Save & Download] |
+-----------------------+---------------------------------------------------------------------------+
|  PAGE MANAGER (Left)  |  VIEWPORT / EDIT CANVAS (Center)                                          |
|  +-----------------+  |                                                                           |
|  | [Page 1]        |  |  +---------------------------------------------------------------------+  |
|  | ▲ ▼ ↻ 🗑️       |  |  |                                                                     |  |
|  +-----------------+  |  |  [ PDF Page Rendered via PDF.js Canvas (Base Layer) ]               |  |
|  | [Page 2]        |  |  |  [ Interactive SVG/Canvas Vector Overlay (Annotation Layer) ]       |  |
|  | ▲ ▼ ↻ 🗑️       |  |  |                                                                     |  |
|  +-----------------+  |  +---------------------------------------------------------------------+  |
|  | + Add Page / ...|  |                                                                           |
+-----------------------+---------------------------------------------------------------------------+
```

1. **Top Toolbar**:
   * **Select / Pan Tool**: Default inspection state; allows selecting and repositioning placed annotations.
   * **Add Text (`T`)**: Click anywhere on the active page to spawn an editable text frame. Configurable font size (`12pt`, `14pt`, `18pt`, `24pt`, `32pt`) and color palette (`#000000`, `#2563EB`, `#DC2626`, `#FFFFFF`).
   * **Whiteout (Visual Cover Only) (`▭`)**: Drag to draw filled rectangular blocks to visually hide content.
     * *Mandatory Warning Banner*: Whenever the whiteout tool is active or a whiteout box is placed, an amber callout is displayed on screen:
       > **Notice:** *Whiteout visually covers content on rendered pages, but does not sanitize underlying text streams. Covered text remains extractable from the raw file by search engines or PDF inspectors — this is not cryptographic redaction.*
   * **Pen / Signature (`✎`)**: Freehand brush for handwritten signatures, margin notes, or checkmarks. Records continuous stroke coordinates.
   * **Highlighter (`░`)**: Semi-transparent rectangular marker (35% opacity in Yellow, Emerald, or Cyan) for emphasizing key lines without obscuring text.
   * **Action Controls**: Undo (`Ctrl+Z`), Delete Selected (`Del`), Clear Page Edits.
   * **Zoom Controls**: Fit to Width, 100%, Zoom In (+), Zoom Out (-).
   * **Export Trigger**: Primary obsidian button labeled **"Save & Download PDF"** with a live progress state.

2. **Left Sidebar (Page Manager)**:
   * Vertical thumbnail navigation showing every page in the document.
   * Per-page micro-actions:
     * **`▲` Move Up / `▼` Move Down**: Reorders page sequence.
     * **`↻` Rotate 90°**: Rotates the individual page clockwise.
     * **`🗑️` Delete**: Flags page for exclusion from final export.
   * Active page indicated by a sapphire blue indicator border and badge.

3. **Center Canvas (Viewport Layer)**:
   * **Base Layer**: Rendered at device pixel ratio using `pdfjs-dist` to ensure crisp reading.
   * **Overlay Layer**: Real-time vector interaction surface capturing user mouse/touch input.

---

## 3. Vector-Only Stamping Pipeline (`src/lib/pdf/edit.ts`)

### 3.1 Non-Destructive Vector Execution
To resolve architectural contradictions and preserve print-quality fidelity, **no rasterization into images is permitted at any stage of the export pipeline**. All annotations are translated into native PDF graphics operators:

1. **Text Annotations**:
   * Evaluated through `page.drawText(text, { x, y, size, font, color })`.
   * Coordinates converted from viewport screen space (`CSS pixels`) to standard PDF points (`72 pt/inch`) using exact aspect scaling:
     $$\text{x}_{\text{pdf}} = \frac{\text{x}_{\text{screen}}}{\text{scale}} \times \frac{72}{\text{DPI}}$$
     $$\text{y}_{\text{pdf}} = \text{pageHeight} - \left(\frac{\text{y}_{\text{screen}}}{\text{scale}} \times \frac{72}{\text{DPI}}\right)$$
2. **Whiteout Blocks**:
   * Drawn using native `page.drawRectangle({ x, y, width, height, color: rgb(r, g, b), opacity: 1.0 })`.
   * Standard color presets: White (`rgb(1, 1, 1)`) or Black (`rgb(0, 0, 0)`).
3. **Pen & Signature Strokes**:
   * Recorded as arrays of points $[(x_0, y_0), (x_1, y_1), \dots, (x_n, y_n)]$.
   * Stamped as chained vector line segments via `page.drawLine({ start, end, thickness, color, opacity })`.
   * Preserves infinitely zoomable vector paths with zero raster pixelation.
4. **Highlights**:
   * Stamped via `page.drawRectangle` or thick `page.drawLine` with `opacity: 0.35` and standard highlight RGB pigments (e.g. Yellow: `rgb(1, 0.92, 0.23)`).

### 3.2 Page Recombination & Output Construction
* Document initialized via `PDFDocument.create()`.
* Surviving pages (excluding deleted indices) are copied sequentially from source document using `destDoc.copyPages(srcDoc, pageIndices)`.
* Individual rotation angles are applied to respective pages using `page.setRotation(degrees(angle))`.
* Annotations mapped to each page index are stamped using the vector operators.
* Compiled document exported via `destDoc.save()`.

---

## 4. Bengali & Multilingual Font Engine

### 4.1 Technical Challenge
Standard PDF Type 1 fonts (Helvetica, Times Roman, Courier) built into PDF specifications only encode WinAnsi / Latin-1 characters. Submitting Bengali script (e.g., "নথি সম্পাদনা", "বাংলা") causes `pdf-lib` to throw encoding exceptions or render unreadable empty boxes.

### 4.2 Solution Architecture
1. **Fontkit Integration**: Register `@pdf-lib/fontkit` into the document instance:
   ```typescript
   import fontkit from '@pdf-lib/fontkit';
   pdfDoc.registerFontkit(fontkit);
   ```
2. **Unicode Font Asset**:
   * Deploy lightweight OpenType/TrueType font: `NotoSansBengali-Regular.ttf` in `public/fonts/`.
   * Preload or fetch lazily upon text tool activation:
     ```typescript
     const fontBytes = await fetch('/fonts/NotoSansBengali-Regular.ttf').then(res => res.arrayBuffer());
     const customBengaliFont = await pdfDoc.embedFont(fontBytes, { subset: true });
     ```
3. **Font Selection Fallback Chain**:
   * Inspect input string characters:
     * If character code falls within the Bengali Unicode block (`\u0980`–`\u09FF`) or extended multilingual ranges, route rendering to `customBengaliFont`.
     * If strictly ASCII/Latin-1, route to standard `StandardFonts.Helvetica` or `customBengaliFont` uniformly.

---

## 5. Honesty & Disclosure Standards

1. **No False Claims**:
   * The word "redact" or "permanent redaction" must NOT appear anywhere in the UI, button labels, documentation, or SEO copy as an absolute guarantee.
   * Tool is formally titled and labeled: **"Whiteout (visual cover only)"**.
2. **On-Screen Disclaimer**:
   * Explicit visual disclaimer banner mounted in the editor toolbar and help popover:
     *"Covered text remains extractable from the file — not true redaction."*
3. **Editorial Policy**:
   * Educational copy explains the difference between visual whiteout and cryptographic sanitization, recommending that users never use visual covers for classified or legally sensitive secrets.

---

## 6. Compatibility & Verification Matrix

The draft's generic "100% compatibility" claim is replaced with an explicit multi-platform test matrix. Every release must be validated against the following standard PDF rendering engines before deployment:

| Target Viewer / Platform | Engine Type | Test Requirement | Verification Status |
| :--- | :--- | :--- | :---: |
| **Google Chrome / Chromium** | PDFium | Vector text, whiteout boxes, and line signatures render without artifacts; text is selectable. | *Pending Pre-Ship Test* |
| **Adobe Acrobat Reader (Desktop/Mobile)** | Adobe Native Engine | Opens without "An error exists on this page" prompt; font glyphs (Latin & Bengali) display cleanly. | *Pending Pre-Ship Test* |
| **Microsoft Edge** | PDFium / Edge PDF Reader | Proper layer rendering order; highlights appear transparent above text. | *Pending Pre-Ship Test* |
| **Apple Preview (macOS & iOS Safari)** | CoreGraphics PDF Engine | Proper page orientation preserved; vector annotations scale cleanly at 400% zoom. | *Pending Pre-Ship Test* |
| **Foxit PDF Reader** | Foxit Rendering Engine | Valid stream structure; page reordering and deletion match expectations. | *Pending Pre-Ship Test* |

---

## 7. Safety Limits & Edge Performance

1. **100MB File Size Guard**: Enforced before loading bytes into memory. Prevents browser crashes on low-RAM mobile devices.
2. **Progress Feedback**: Real-time percentage progress callback during PDF parsing, vector stamping, and compression.
3. **Memory Hygiene**: Revokes object URLs and clears canvas buffers upon unmounting or loading a new document.

---

## 8. SEO, Metadata & Catalog Integration

* **Route**: `/tools/edit-pdf`
* **Content Source**: `src/content/tools/edit-pdf.md`
* **Category**: `organize` (displays under Organize & Edit in homepage directory)
* **Metadata**:
  * **Title**: `Edit PDF Online Free — Add Text, Whiteout & Sign | AirPDF`
  * **Meta Description**: `Free, private in-browser PDF editor. Add text with Bengali support, apply visual whiteout, draw signatures, and organize pages offline with zero server uploads.` (158 characters).
* **Structured Data**:
  * `WebApplication` schema with free pricing and vector editing feature list.
  * `FAQPage` schema featuring 5 targeted search-intent questions.
  * `BreadcrumbList` schema (`Home > Tools > Edit PDF`).
* **Sitemap & Robots**:
  * Automatically included in `sitemap-index.xml` and `sitemap-0.xml` via Astro static collection.

---

## 9. Self-Review & Integrity Checklist

- [x] **Placeholder Scan**: No TODOs, TBDs, or vague implementations.
- [x] **Internal Consistency**: Whiteout is strictly visual; all stamping is 100% vector (zero raster images); Bengali fontkit pipeline is explicitly specified.
- [x] **Scope Check**: Tightly scoped to annotation tools (text, whiteout, pen, highlight) + page reordering/rotation/deletion.
- [x] **Ambiguity Check**: Coordinate conversions and viewer matrix clearly defined.
