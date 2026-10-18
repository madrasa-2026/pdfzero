# Feature Specification: PDF Split in Half / Two-Page Spread Cutter (`/tools/split-spread-pdf`)

## 1. Problem Statement & User Value
Students, academics, researchers, and book readers frequently download or scan books, sheet music, magazines, manga, and archived documents where two facing pages were scanned together side-by-side as a single landscape sheet.

Reading a two-page spread on a smartphone, Kindle, tablet, or e-reader is frustrating—the text is tiny, and readers are forced to constantly zoom in, pan left, pan right, and scroll back and forth. Commercial software like Adobe Acrobat Pro ($239/year), PDF-XChange ($56), and Sejda limit or charge for spread cutting. Free alternatives watermark files or upload copyrighted books to remote servers.

**AirPDF Solution**:
A 100% Free, Client-Side Two-Page Spread Cutter. It splits scanned book spreads down the center into separate individual pages with correct reading order (LTR or RTL Manga), intelligent cover-page preservation, spine gutter seam removal, and 100% vector quality—all executed directly in the browser with zero cloud uploads.

## 2. Mathematical Geometry & Split Algorithm (`src/lib/pdf/splitSpread.ts`)
For each source page of dimensions $W \times H$:
1. **Orientation & Spread Filtering**:
   - If `onlyLandscape` is enabled: only pages with $W > H$ are split; portrait pages are preserved as-is.
   - Cover page preservation:
     - `all`: Split all pages.
     - `skip-first`: Page 1 kept as single page; pages $2 \dots N$ split.
     - `skip-first-and-last`: Page 1 and Page $N$ kept as single; inner pages split.
2. **Vertical Split (Left / Right)**:
   Given split ratio $R \in (0, 1)$ (default $0.5$) and optional center spine gutter $G \ge 0$:
   - Split X coordinate: $X_s = W \times R$
   - Left subpage width: $W_L = X_s - G / 2$
   - Right subpage width: $W_R = W - X_s - G / 2$
   - Embedded Form XObject drawing:
     - Left page: sheet $[W_L, H]$, draw embedded page at $(0, 0)$.
     - Right page: sheet $[W_R, H]$, draw embedded page at $(-X_s - G / 2, 0)$.
3. **Horizontal Split (Top / Bottom)**:
   For landscape multi-card sheets, receipts, or presentation slides:
   - Split Y coordinate: $Y_s = H \times R$
   - Top subpage height: $H_T = H - Y_s - G / 2$
   - Bottom subpage height: $H_B = Y_s - G / 2$
   - Top page drawn at $(0, -Y_s - G / 2)$, bottom page drawn at $(0, 0)$.
4. **Reading Order Handling**:
   - `ltr` (Western): Left subpage emitted first, then Right subpage.
   - `rtl` (Manga, Arabic, Hebrew): Right subpage emitted first, then Left subpage.
5. **Zero Quality Loss**:
   Pages are embedded via `destDoc.embedPdf(srcDoc, [i])` as native PDF Form XObjects. Fonts, vector paths, selectable text, and image resolutions remain 100% intact.

## 3. Security & Privacy
- 100% Client-side execution in browser memory.
- Confidential manuscripts, textbooks, and personal documents never leave the computer.
