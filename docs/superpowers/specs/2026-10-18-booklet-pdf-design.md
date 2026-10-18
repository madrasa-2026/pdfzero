# Specification: PDF Booklet & Imposition Duplex Creator (`/tools/booklet-pdf`)

## 1. Problem & Competitor Landscape
- **Competitor Lock-in:** Adobe Acrobat Pro, Quite Imposing, and Sejda charge $15–$50+/month for booklet imposition and N-Up duplex layout.
- **The Core Problem:** Printing a booklet on a standard double-sided home/office printer requires specific saddle-stitch page reordering. Folding a paper in half means page 1 and page 8 must be printed side-by-side on the same physical sheet. Doing this manually in print dialogs is notoriously confusing and error-prone.
- **AirPDF Solution:** 100% in-browser Booklet & Imposition engine that automatically computes saddle-stitch duplex ordering, pads to multiples of 4, embeds vector pages side-by-side on landscape sheets, adds optional gutter margins and fold crease guides, and outputs a print-ready duplex PDF.

## 2. Technical Architecture & Algorithm

### Saddle-Stitch Imposition Algorithm
Given input PDF with $P$ pages:
1. Target pages $N = \lceil P / 4 \rceil \times 4$. If $P < N$, pad with blank pages.
2. For $k = 0, 1, \dots, (N/4 - 1)$:
   - **Sheet $(2k + 1)$ [Front]:** Left = Page $(N - 2k)$, Right = Page $(2k + 1)$
   - **Sheet $(2k + 2)$ [Back]:**  Left = Page $(2k + 2)$, Right = Page $(N - 2k - 1)$
3. For Right-to-Left binding (e.g. Arabic, Hebrew, or Manga), swap left and right positions on each sheet.

### Vector Page Embedding (`pdf-lib`)
- Use `destDoc.embedPage(srcPage)` to embed the original vector content streams without re-encoding or rasterizing.
- Each new sheet page dimensions:
  - Width: $2 \times \text{pageWidth} + \text{gutter}$
  - Height: $\text{pageHeight}$
- Draw embedded pages using:
  ```ts
  sheet.drawPage(leftPage, { x: 0, y: 0, width: pageWidth, height: pageHeight });
  sheet.drawPage(rightPage, { x: pageWidth + gutter, y: 0, width: pageWidth, height: pageHeight });
  ```
- Optional center fold guide: Light dashed line drawn at $x = \text{pageWidth} + \text{gutter} / 2$ with opacity $0.35$.

### 2-Up / 4-Up Handout Mode
- Also support standard 2-Up (Pages 1 & 2 on sheet 1, Pages 3 & 4 on sheet 2) and 4-Up grid for lecture notes, presentation slides, and study guides.

## 3. UI/UX Flow (`BookletPdfIsland.astro`)
1. **Dropzone:** File selection with page count, estimated sheets required, and booklet compatibility indicator.
2. **Configuration Controls:**
   - **Mode:**
     - 📖 Saddle-Stitch Booklet (Fold & staple in half)
     - 📑 2-Up Handout (Side-by-side sequential)
     - 📊 4-Up Compact (4 slides/sheet)
   - **Binding Direction:** Left-to-Right (Standard) / Right-to-Left (Manga / RTL)
   - **Center Fold Crease Line:** Checkbox (draw faint fold guide line)
   - **Gutter Margin:** Slider / preset (0 pt, 12 pt, 24 pt)
3. **Live Imposition Preview:**
   - Displays sheet preview table showing: "Sheet 1: [Page 8] + [Page 1]", "Sheet 2 (Back): [Page 2] + [Page 7]".
4. **Instant Vector Download:**
   - Downloads ready-to-print duplex PDF with `-booklet.pdf` suffix.

## 4. Verification & Testing Strategy
- Unit tests in `tests/pdf/booklet.test.ts`:
  - Verify saddle-stitch page ordering math for 4, 8, 12 pages and uneven counts (e.g. 5 or 7 pages padded to 8).
  - Verify RTL binding ordering.
  - Verify generated PDF loads cleanly with correct sheet count and embedded pages.
- Dual Audit:
  - Code/Security: Vitest, zero external requests, memory safety.
  - Human UX: Dropzone, sheet order preview, download action, SEO/FAQ verification.
