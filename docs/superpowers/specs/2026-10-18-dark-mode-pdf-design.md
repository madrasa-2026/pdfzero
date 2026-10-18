# Feature Specification: PDF Color Inverter & Dark Mode Creator (`/tools/dark-mode-pdf`)

## 1. Problem Statement & User Value
Reading academic research papers, university textbooks, scanned legal documents, and ebooks at night causes acute eye strain due to harsh, bright white page backgrounds.
While browser extensions can temporarily apply CSS filters to the webpage, they:
1. Do not modify the actual PDF file.
2. Break when downloaded, sent to clients, or loaded on e-readers (Kindle, Kobo, Boox) and tablets.
3. Adobe Acrobat Pro charges $19.99/mo and locks dark mode reading behind proprietary subscription software.

**AirPDF Solution**:
A 100% Free, Client-Side PDF Color Inverter and Dark Mode Creator that permanently transforms any PDF into a high-contrast dark or sepia document with zero server uploads.

## 2. Supported Themes & Color Science
1. **Midnight Slate** (Default / Recommended):
   - Background: `#121212` (RGB: 0.071, 0.071, 0.071)
   - Foreground / Text: `#e2e8f0` (RGB: 0.886, 0.910, 0.941)
   - Soft, balanced contrast engineered to minimize glare without blinding intensity.
2. **Warm Sepia (Night Owl)**:
   - Background: `#fbf0d9` (RGB: 0.984, 0.941, 0.851)
   - Foreground / Text: `#382b1d` (RGB: 0.220, 0.169, 0.114)
   - Blue-light reduction for bedtime reading.
3. **OLED Pitch Black**:
   - Background: `#000000` (RGB: 0.0, 0.0, 0.0)
   - Foreground / Text: `#ffffff` (RGB: 1.0, 1.0, 1.0)
   - Infinite contrast and battery saving for OLED displays.
4. **Solarized Dark**:
   - Background: `#002b36` (RGB: 0.0, 0.169, 0.212)
   - Foreground / Text: `#839496` (RGB: 0.514, 0.580, 0.588)
   - Classic low-contrast developer aesthetic.

## 3. Architecture & Processing Modes
The engine (`src/lib/pdf/darkMode.ts`) supports dual-mode processing:
1. **Smart Vector Engine (Fast & Searchable)**:
   - Prepends an isolated graphics state (`q ... Q`) background rectangle filling the `MediaBox` of each page before existing contents.
   - Transforms RGB (`rg`, `RG`), Grayscale (`g`, `G`), and CMYK (`k`, `K`) operators in content streams.
   - Preserves 100% vector scalability, small file sizes, and selectable text.
   - Inverts raster image XObjects when enabled.
2. **Canvas Pixel-Filter Engine (Universal / Scanned)**:
   - Uses `pdfjs-dist` to render pages to an offscreen canvas at configurable DPI (150–200 DPI).
   - Applies pixel-level color matrix transformations.
   - Recompiles into a crisp dark-mode PDF via `pdf-lib`.

## 4. Security & Privacy
- 100% Client-side processing using WebAssembly and Web APIs.
- Zero server uploads; private documents never leave the local browser environment.
- Works fully offline.
