# Feature Specification: PDF N-Up Multi-Page Imposer (`/tools/nup-pdf`)

## 1. Problem Statement & User Value
Students, teachers, conference presenters, corporate trainers, and print shops frequently need to print multiple PDF pages onto a single physical sheet (2-up, 4-up, 8-up handouts, 9-up presentation review slides, or 16-up index sheets) to save paper, reduce printing costs, and produce convenient booklet summaries.

Adobe Acrobat Pro ($239/year) and specialized print imposition suites (like Quite Imposing Plus at $499) charge steep commercial licenses for N-Up imposition. Free online services impose page limits, upload sensitive presentations and confidential documents to cloud servers, and watermark outputs.

**AirPDF Solution**:
A 100% Free, Client-Side PDF N-Up Multi-Page Imposer that tiles arbitrary PDF pages into flexible grid configurations (2-up, 4-up, 6-up, 8-up, 9-up, 16-up) on standard paper sizes (A4, Letter, Legal, A3, or Source) with automatic orientation matching, customizable margins, tile borders, and professional trimmer cut marks—all rendered in browser memory with zero server uploads and 100% vector fidelity.

## 2. Mathematical Geometry & Imposition Algorithm (`src/lib/pdf/nup.ts`)
Each output sheet of dimensions $W_s \times H_s$ is divided into an $R \times C$ grid:
1. **Target Grid Cells**:
   Given outer margin $M$ and cell spacing/gutter $G$:
   - Available width for cells: $W_{avail} = W_s - 2M - (C - 1)G$
   - Available height for cells: $H_{avail} = H_s - 2M - (R - 1)G$
   - Individual cell width: $W_c = W_{avail} / C$
   - Individual cell height: $H_c = H_{avail} / R$
2. **Aspect-Ratio Preserved Fit**:
   For source page of dimensions $w_p \times h_p$:
   - Scaling factor: $s = \min(W_c / w_p, H_c / h_p)$
   - Fitted page width and height: $w_f = s \cdot w_p$, $h_f = s \cdot h_p$
   - Centering offsets inside cell $(col, row)$:
     $x_{pos} = M + col \cdot (W_c + G) + \frac{W_c - w_f}{2}$
     $y_{pos} = H_s - (M + (row + 1) \cdot H_c + row \cdot G) + \frac{H_c - h_f}{2}$ (in bottom-left PDF coordinate system)
3. **Ordering Logic**:
   - `horizontal`: Cell index $k = row \cdot C + col$
   - `vertical`: Cell index $k = col \cdot R + row$
4. **Finishing Elements**:
   - `drawBorders`: Draws 0.5pt stroke around $[x_{pos}, y_{pos}, w_f, h_f]$ in `#cbd5e1`.
   - `drawCutMarks`: Draws standard 6pt printer tick marks at the 4 corners of each cell bounding box.
5. **Vector Integrity**:
   Source pages are embedded via `destDoc.embedPdf(srcDoc, pageIndices)` as Form XObjects and drawn onto new sheets with `sheet.drawPage(embeddedPage, ...)`. Text remains 100% vector-sharp and searchable.

## 3. Supported Configurations
- **Layouts**:
  - `2-up`: 1 row × 2 cols (or 2 rows × 1 col)
  - `4-up`: 2 rows × 2 cols
  - `6-up`: 2 rows × 3 cols (or 3 rows × 2 cols)
  - `8-up`: 2 rows × 4 cols (or 4 rows × 2 cols)
  - `9-up`: 3 rows × 3 cols
  - `16-up`: 4 rows × 4 cols
- **Sheet Sizes**:
  - `a4`: 595.28 × 841.89 pt
  - `letter`: 612.0 × 792.0 pt
  - `legal`: 612.0 × 1008.0 pt
  - `a3`: 841.89 × 1190.55 pt
  - `source`: Matches first page dimensions scaled
- **Orientations**: `auto` (auto-detects landscape vs portrait to minimize wasted white space), `portrait`, `landscape`
- **Outer Margins**: `0pt`, `18pt` (0.25 in), `36pt` (0.5 in)
- **Cell Spacing**: `0pt`, `8pt`, `16pt`

## 4. Security & Privacy
- 100% Client-side processing using `pdf-lib`.
- Zero network transfers; works completely offline.
