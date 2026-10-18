# Feature Specification: In-Browser PDF to CSV / Table Extractor (`/tools/pdf-to-csv`)

## 1. Problem Statement & User Value
Financial analysts, accountants, researchers, students, and legal teams frequently need to extract tabular data (bank statements, tax records, price lists, scientific data) from PDF documents into spreadsheet software like Microsoft Excel, Google Sheets, or Apple Numbers.

Commercial tools like Adobe Acrobat Pro ($239/year), Able2Extract ($149), and Smallpdf ($108/year) charge exorbitant subscriptions for table export. Free online converters upload confidential banking and corporate records to third-party cloud servers.

**AirPDF Solution**:
A 100% Free, Client-Side PDF to CSV Table Extractor that reconstructs tabular grid structures from PDF text coordinates and exports clean `.csv` files locally in the browser with zero server uploads.

## 2. Table Extraction Science & Geometry Algorithm (`src/lib/pdf/tableExtractor.ts`)
PDF documents do not natively store tables or cells; they store independent text chunks placed at arbitrary 2D Cartesian coordinates $(x, y)$.

### The Table Reconstruction Algorithm:
1. **Extract Text Elements with Coordinates**:
   Using `pdfjs-dist`, extract all text items on each page along with their bounding box: `x`, `y`, `width`, `height`, and `text`.
2. **Sort by Vertical Baseline (Y-Axis)**:
   In PDF space, the origin $(0, 0)$ is bottom-left. Sort text items primarily from top to bottom (descending $y$), and secondarily from left to right (ascending $x$).
3. **Cluster Rows with Vertical Tolerance**:
   Group items whose vertical baselines fall within a tolerance threshold (e.g., $\Delta y \le \text{lineHeight} \times 0.6$ or $4\text{pt}$) into a single table row.
4. **Cluster Columns with Horizontal Gap Detection**:
   Within each row, detect column boundaries by calculating inter-item horizontal gaps. If distance $x_{i+1} - (x_i + w_i) > \text{threshold}$, treat as a new column.
5. **Multi-Column Alignment Alignment Matrix**:
   Construct a uniform grid across the detected column split points so misaligned or ragged cells align to common table columns.
6. **CSV Serialization & Escaping**:
   Escape quotes (`"` -> `""`) and wrap cells containing commas, quotes, or newlines in standard RFC 4180 CSV format.
7. **Multi-Page Handling**:
   Option to export all pages as a single unified CSV or separate tables per page.

## 3. Security & Privacy
- 100% Client-side execution in browser memory.
- Confidential financial data, bank statements, and tax forms never leave the user's computer.
- Works fully offline.
