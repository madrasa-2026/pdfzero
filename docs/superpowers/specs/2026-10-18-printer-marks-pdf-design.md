# Specification: PDF Prepress Bleed, Trim & Registration Marks Stamper (`/tools/printer-marks-pdf`)

## 1. Executive Summary & Market Context
Amateur and professional designers frequently design business cards, flyers, brochures, posters, and books using Canva, Google Docs, Word, or Figma. However, commercial printing presses (offset Heidelberg, HP Indigo, commercial book printers) reject raw PDFs if they lack standard prepress printer marks: corner trim cut marks, bleed boundaries, registration alignment bullseyes, and CMYK calibration density bars.

Commercial prepress software like **Enfocus PitStop Pro** charges **$750/year**, and Adobe InDesign charges **$239/year**. Print shops charge $35 to $75 "prepress setup fees" to add these marks manually.

**AirPDF Prepress Marks Stamper** provides a free, instant, 100% in-browser workstation that expands PDF margins and stamps authentic ISO 12647 compliant prepress trim marks, bleed boxes, registration bullseyes, CMYK calibration wedges, and timestamp slug lines with 100% vector sharpness.

## 2. Core Functional Requirements

### 2.1 MediaBox Expansion & Geometry
- Preserves original page content dimensions as the `/TrimBox`.
- Expands the outer `/MediaBox` on all four edges by a configurable slug margin:
  - Standard (36 pt / 0.5 in / 12.7 mm on all sides) - Default.
  - Generous (54 pt / 0.75 in / 19 mm).
  - Compact (24 pt / 0.33 in / 8.5 mm).
- Centers the original page inside the expanded canvas:
  - Offset `offsetX = slugMargin`, `offsetY = slugMargin`.

### 2.2 Vector Printer Mark Primitives
1. **Corner Trim Marks**:
   - 8 hairline tick marks (0.35 pt line width).
   - Drawn outside the trim box at each of the 4 corners (horizontal and vertical ticks), pointing exactly to the cut lines.
   - Standard length: 14 pt (approx 5 mm) with a 4 pt offset gap from the actual trim corner to prevent marks from encroaching onto the live artwork.
2. **Bleed Boundary Guide (Optional)**:
   - Outer bleed ticks (standard 9 pt / 3 mm / 0.125 in bleed distance from trim line).
3. **Registration Bullseye Targets**:
   - 4 circular alignment targets centered along the top, bottom, left, and right margins.
   - Drawn with two concentric circles (radius 4 pt and 2 pt) and intersecting hairline crosshairs with 1 pt center knockout (industry standard printer registration mark).
4. **CMYK & Grayscale Density Step Wedges**:
   - 10-step color calibration swatches printed along the top or bottom slug margin:
     - 100% Cyan, 100% Magenta, 100% Yellow, 100% Black.
     - 50% Cyan, 50% Magenta, 50% Yellow, 50% Black.
     - 25% tint, 75% tint, and 100% solid registration black.
5. **Slug Line Information Bar**:
   - Printed in 7 pt Helvetica in the slug margin:
     `[Filename.pdf] • Page [N] of [Total] • [Timestamp] • Trim: [W x H mm] • AirPDF Prepress Engine`.

### 2.3 User Configurable Options
- **Slug Margin Width**: `24 pt` (Compact), `36 pt` (Standard / Recommended), `54 pt` (Wide).
- **Bleed Distance**: `0 mm`, `3 mm` (Standard 0.125 in / 9 pt), `5 mm`.
- **Include Corner Trim Marks**: Boolean (default: true).
- **Include Registration Bullseyes**: Boolean (default: true).
- **Include CMYK Calibration Wedges**: Boolean (default: true).
- **Include Text Slug Line**: Boolean (default: true).

## 3. UI/UX Interface (`PrinterMarksPdfIsland.astro`)
- Specimen Dropzone: Drag/drop design PDF.
- Configuration Controls: Slug margin, bleed toggle, mark options.
- Visual Sheet Preview:
  - High-resolution canvas rendering the sheet.
  - Red dashed guide showing the Trim line.
  - Cyan dashed guide showing the Bleed line.
  - Visible vector corner trim ticks, registration bullseyes, and CMYK color bars.
- Action: "Download Print-Ready PDF" button.
