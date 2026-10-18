# Feature Specification: PDF Poster Maker & Multi-Sheet Tiler (`/tools/poster-pdf`)

## 1. Problem Statement & User Value
Teachers, students, engineers, sewing hobbyists, conference presenters, and artists frequently need to print large-format posters, classroom charts, life-sized sewing patterns, CAD schematics, and banners.

However, standard home and office printers can only feed standard A4 or US Letter sheets. Plotting a 3-foot by 4-foot poster at a local copy shop costs $40–$80. Commercial poster printing utilities and Adobe Acrobat Pro ($239/year) charge subscriptions for poster tiling, while free web tools place watermarks over your artwork.

**AirPDF Solution**:
A 100% Free, Client-Side PDF Poster Maker & Tiler. It scales any single-page or multi-page PDF across a customizable grid of standard home sheets (2×2, 3×3, 4×4, or custom rows/columns) with adjustable glue overlap margins, tile position numbering, and dashed trimmer alignment marks—all calculated client-side with 100% vector fidelity and zero cloud uploads.

## 2. Mathematical Geometry & Poster Imposition Algorithm (`src/lib/pdf/posterEngine.ts`)
Given target sheet dimensions $W_s \times H_s$ (A4 or US Letter), grid columns $C$, grid rows $R$, and glue overlap margin $O$:
1. **Total Assembled Poster Dimensions**:
   - Total width: $W_{total} = C \cdot W_s - (C - 1) \cdot O$
   - Total height: $H_{total} = R \cdot H_s - (R - 1) \cdot O$
2. **Aspect Ratio Preservation**:
   For source page of dimensions $w_p \times h_p$:
   - Scale factor: $S = \min(W_{total} / w_p, H_{total} / h_p)$
   - Scaled poster width: $w_f = w_p \cdot S$
   - Scaled poster height: $h_f = h_p \cdot S$
   - Centering offsets:
     $X_{offset} = (W_{total} - w_f) / 2$
     $Y_{offset} = (H_{total} - h_f) / 2$
3. **Tile Coordinate Mapping**:
   For grid cell $(col, row)$ where $col \in [0, C-1]$ and $row \in [0, R-1]$ (with row 0 as top row):
   - In PDF bottom-left coordinate space, the offset to draw the embedded source page Form XObject on sheet $(col, row)$ is:
     $X_{draw} = X_{offset} - col \cdot (W_s - O)$
     $Y_{draw} = Y_{offset} - (R - 1 - row) \cdot (H_s - O)$
4. **Assembly Guides & Trimmer Lines**:
   - Draw subtle dashed cut line along overlap boundaries.
   - Print light margin callout at corner: `Tile [Col ${col+1}, Row ${row+1}] of [${C} × ${R}]`.
5. **100% Vector Quality**:
   Source page is embedded as native Form XObject. CAD line art, vector paths, fine text, and high-resolution photos print at maximum physical printer DPI without pixelation.

## 3. Supported Configurations
- **Standard Grids**: 2×2 (4 sheets), 3×3 (9 sheets), 4×4 (16 sheets), 2×1 (2 sheets wide), 1×2 (2 sheets tall), 3×2, 4×2, custom.
- **Paper Sizes**: A4 (`595.28 × 841.89 pt`), US Letter (`612.0 × 792.0 pt`), A3 (`841.89 × 1190.55 pt`).
- **Overlap Margins**: None (0 pt), 15 mm / 0.5 in (36 pt), 25 mm / 1.0 in (72 pt).
- **Assembly Labels**: On / Off.

## 4. Security & Privacy
- 100% Client-side execution in browser memory.
- Proprietary CAD designs, sewing patterns, and personal photos never leave the computer.
