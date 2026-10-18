# Feature Specification: PDF Measurement & Architectural Scale Calibrator (`/tools/measure-pdf`)

## 1. Problem Statement & User Value
Architects, civil engineers, electrical contractors, quantity surveyors, interior designers, and homeowners frequently need to measure linear distances, wall lengths, room perimeters, and square footage on PDF blueprints, floor plans, and CAD drawings.

Professional construction takeoff software like Bluebeam Revu ($240–$400/year), PlanSwift ($1,500+), and Adobe Acrobat Pro ($239/year) charge steep subscriptions for scale calibration and area takeoff tools. Free online alternatives upload sensitive intellectual property and proprietary building plans to remote servers.

**AirPDF Solution**:
A 100% Free, Client-Side PDF Measurement & Architectural Scale Calibrator. Users can upload any blueprint or floor plan PDF, calibrate scale by clicking two points with a known real-world dimension (e.g., a scale bar, door width, or dimension line), measure linear distances, polylines, and polygon areas, and export a calibrated annotated PDF or Takeoff CSV summary—all running locally in the browser with zero cloud uploads.

## 2. Mathematical Geometry & Measurement Engine (`src/lib/pdf/measureEngine.ts`)
1. **Interactive High-DPI Rendering**:
   PDF pages are rendered onto an HTML5 canvas at crisp 2x or 3x device pixel ratio using `pdfjs-dist`.
2. **Two-Point Scale Calibration**:
   Given points $P_1(x_1, y_1)$ and $P_2(x_2, y_2)$ in canvas coordinate space:
   - Euclidean distance in screen points: $D_{pts} = \sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}$
   - Scale factor: $S = \frac{\text{knownRealDistance}}{D_{pts}}$ in units per point.
   - Supported measurement units: `m`, `cm`, `mm`, `ft`, `in`, `yd`.
3. **Measurement Calculation**:
   - **Linear Distance**: $D_{real} = \sqrt{(x_b - x_a)^2 + (y_b - y_a)^2} \times S$
   - **Perimeter / Polyline**: $\sum_{i=0}^{n-1} \text{dist}(P_i, P_{i+1}) \times S$
   - **Polygon Area (Shoelace Formula)**:
     $A_{pts} = \frac{1}{2} \left| \sum_{i=0}^{n-1} (x_i y_{i+1} - x_{i+1} y_i) \right|$
     $A_{real} = A_{pts} \times S^2$ in square units ($m^2$, $ft^2$).
4. **Vector Dimension Burning (`pdf-lib`)**:
   Users can export an annotated PDF where all measured lines, tick markers, dimension arrows, and label badges are burned as crisp vector shapes and Helvetica text into the PDF content stream at exact 72 pt/inch coordinates.
5. **CSV Takeoff Report**:
   Export measured elements (ID, Name, Type, Length / Area, Unit, Timestamp) for instant copy/paste into Excel or Google Sheets estimation spreadsheets.

## 3. Security & Privacy
- 100% Client-side execution in browser memory.
- Confidential architectural blueprints, client property layouts, and NDA schematics never leave the computer.
