# Implementation Plan: PDF Measurement & Architectural Scale Calibrator (`/tools/measure-pdf`)

## Phase 1: Core Geometry Engine (`src/lib/pdf/measureEngine.ts`)
- Define `Point2D`, `MeasurementUnit` (`'m' | 'cm' | 'mm' | 'ft' | 'in' | 'yd'`), `MeasurementType` (`'distance' | 'perimeter' | 'area'`).
- Define `MeasurementItem` and `CalibrationConfig`.
- Implement `calculateDistance(p1: Point2D, p2: Point2D): number`.
- Implement `calculatePolygonArea(points: Point2D[]): number` using Gauss's shoelace formula.
- Implement `calibrateScale(p1: Point2D, p2: Point2D, realDistance: number, unit: MeasurementUnit): CalibrationConfig`.
- Implement `formatMeasurementValue(value: number, unit: MeasurementUnit, isArea?: boolean): string`.
- Implement `burnMeasurementsToPdf(pdfBytes: Uint8Array, pageIndex: number, measurements: MeasurementItem[], calibration: CalibrationConfig, canvasDimensions: { width: number; height: number }): Promise<Uint8Array>`.
- Implement `exportTakeoffCsv(measurements: MeasurementItem[], calibration: CalibrationConfig): string`.

## Phase 2: Unit Testing (`tests/pdf/measureEngine.test.ts`)
- Test 1: Linear distance calculation between Cartesian points.
- Test 2: Polygon area calculation for 2D shapes (rectangles, triangles) matches exact geometric expectations.
- Test 3: Scale calibration maps screen points to real-world metric and imperial units.
- Test 4: Takeoff CSV serialization formats dimensions properly.
- Test 5: Burning dimension lines into a PDF produces a valid output document with annotations.

## Phase 3: Content Collection & UI Island
- Create `src/content/tools/measure-pdf.md` (`category: 'optimize'`, `icon: 'maximize'`).
- Build `src/components/tools/MeasurePdfIsland.astro` (Dropzone, interactive canvas with crosshair cursor, calibration modal/bar, tool modes: Distance, Perimeter, Area, Clear, live takeoff table, Export Annotated PDF, Export CSV Takeoff).
- Wire router switch in `src/pages/tools/[slug].astro`.
- Update `Footer.astro` (Optimize column), `Header.astro` counter (now 36 tools), and `index.astro`.

## Phase 4: Build, Deploy & Dual Audit
- Run `npm run test` (confirm 29 test suites pass).
- Run `npm run build` (confirm 41 static routes generated cleanly).
- Commit & push to master.
- Deploy to Cloudflare Pages (`airpdf` and `pdfzero`) on branch `main`.
- Execute Dual Audit (AI code/security + Human UI verification) on `https://airpdf.pages.dev/tools/measure-pdf`.
