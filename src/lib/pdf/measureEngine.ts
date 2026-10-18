import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export type MeasurementUnit = 'm' | 'cm' | 'mm' | 'ft' | 'in' | 'yd';
export type MeasurementType = 'distance' | 'perimeter' | 'area';

export interface Point2D {
  x: number;
  y: number;
}

export interface CalibrationConfig {
  scaleRatio: number; // Real units per canvas point/pixel
  unit: MeasurementUnit;
  point1?: Point2D;
  point2?: Point2D;
  pixelDistance?: number;
  realDistance?: number;
  isCalibrated: boolean;
}

export interface MeasurementItem {
  id: string;
  label: string;
  type: MeasurementType;
  points: Point2D[];
  rawPointsValue: number;
  realValue: number;
  formattedString: string;
  color: string;
}

/**
 * Calculates Euclidean distance between two 2D points.
 */
export function calculateDistance(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculates total path length across an array of connected points.
 */
export function calculatePathLength(points: Point2D[], closed = false): number {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += calculateDistance(points[i], points[i + 1]);
  }
  if (closed && points.length > 2) {
    total += calculateDistance(points[points.length - 1], points[0]);
  }
  return total;
}

/**
 * Calculates polygon area using the Shoelace (Gauss) formula.
 */
export function calculatePolygonArea(points: Point2D[]): number {
  const n = points.length;
  if (n < 3) return 0;

  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
}

/**
 * Formats a numerical measurement into a human-readable string with units.
 */
export function formatMeasurementValue(
  value: number,
  unit: MeasurementUnit,
  isArea = false
): string {
  if (isArea) {
    if (unit === 'ft') {
      return `${value.toFixed(2)} sq ft`;
    }
    if (unit === 'in') {
      return `${value.toFixed(1)} sq in`;
    }
    return `${value.toFixed(2)} ${unit}²`;
  }

  // Linear Distance
  if (unit === 'ft') {
    const totalInches = value * 12;
    const feet = Math.floor(value);
    const inches = Math.round(totalInches % 12);
    if (feet > 0 && inches > 0) {
      return `${feet}' ${inches}" (${value.toFixed(2)} ft)`;
    }
    return `${value.toFixed(2)} ft`;
  }

  return `${value.toFixed(2)} ${unit}`;
}

/**
 * Calibrates scale factor using two reference points and a known real distance.
 */
export function calibrateScale(
  p1: Point2D,
  p2: Point2D,
  realDistance: number,
  unit: MeasurementUnit = 'm'
): CalibrationConfig {
  if (realDistance <= 0) {
    throw new Error('Reference calibration distance must be greater than zero.');
  }

  const pixelDistance = calculateDistance(p1, p2);
  if (pixelDistance < 1) {
    throw new Error('Reference points are too close together to calibrate scale accurately.');
  }

  const scaleRatio = realDistance / pixelDistance;

  return {
    scaleRatio,
    unit,
    point1: p1,
    point2: p2,
    pixelDistance,
    realDistance,
    isCalibrated: true,
  };
}

/**
 * Parses hex color to RGB tuple for pdf-lib.
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const intVal = parseInt(clean, 16);
  return {
    r: ((intVal >> 16) & 255) / 255,
    g: ((intVal >> 8) & 255) / 255,
    b: (intVal & 255) / 255,
  };
}

/**
 * Burns measurement dimension lines and text callouts onto a target PDF page.
 */
export async function burnMeasurementsToPdf(
  pdfBytes: Uint8Array,
  pageIndex: number,
  measurements: MeasurementItem[],
  canvasWidth: number,
  canvasHeight: number
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const totalPages = doc.getPageCount();

  if (pageIndex < 0 || pageIndex >= totalPages) {
    throw new Error(`Invalid page index ${pageIndex}. Document has ${totalPages} pages.`);
  }

  const page = doc.getPage(pageIndex);
  const { width: pWidth, height: pHeight } = page.getSize();
  const font = await doc.embedFont(StandardFonts.HelveticaBold);

  const scaleX = pWidth / canvasWidth;
  const scaleY = pHeight / canvasHeight;

  // Function to convert canvas (top-left) to PDF (bottom-left) coordinates
  const toPdfCoord = (pt: Point2D): Point2D => ({
    x: pt.x * scaleX,
    y: pHeight - pt.y * scaleY,
  });

  for (const item of measurements) {
    if (item.points.length < 2) continue;

    const rgbColor = hexToRgb(item.color || '#2563eb');
    const pdfColor = rgb(rgbColor.r, rgbColor.g, rgbColor.b);

    if (item.type === 'distance' && item.points.length === 2) {
      const p1 = toPdfCoord(item.points[0]);
      const p2 = toPdfCoord(item.points[1]);

      // Main dimension line
      page.drawLine({
        start: p1,
        end: p2,
        thickness: 1.5,
        color: pdfColor,
      });

      // Terminal end tick marks (crossbars)
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 0) {
        const nx = -dy / len;
        const ny = dx / len;
        const tickSize = 4;

        page.drawLine({
          start: { x: p1.x - nx * tickSize, y: p1.y - ny * tickSize },
          end: { x: p1.x + nx * tickSize, y: p1.y + ny * tickSize },
          thickness: 1.5,
          color: pdfColor,
        });

        page.drawLine({
          start: { x: p2.x - nx * tickSize, y: p2.y - ny * tickSize },
          end: { x: p2.x + nx * tickSize, y: p2.y + ny * tickSize },
          thickness: 1.5,
          color: pdfColor,
        });
      }

      // Dimension Text Badge
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      const text = item.formattedString;
      const textWidth = font.widthOfTextAtSize(text, 9);

      // Background badge box
      page.drawRectangle({
        x: midX - textWidth / 2 - 3,
        y: midY - 6,
        width: textWidth + 6,
        height: 12,
        color: rgb(1, 1, 1),
        borderColor: pdfColor,
        borderWidth: 0.5,
        opacity: 0.9,
      });

      page.drawText(text, {
        x: midX - textWidth / 2,
        y: midY - 3,
        size: 9,
        font,
        color: pdfColor,
      });
    } else if (item.type === 'perimeter') {
      const pdfPoints = item.points.map(toPdfCoord);
      for (let i = 0; i < pdfPoints.length - 1; i++) {
        page.drawLine({
          start: pdfPoints[i],
          end: pdfPoints[i + 1],
          thickness: 1.5,
          color: pdfColor,
        });
      }

      // Draw label near last point
      const lastPt = pdfPoints[pdfPoints.length - 1];
      const text = `Perimeter: ${item.formattedString}`;
      page.drawText(text, {
        x: lastPt.x + 5,
        y: lastPt.y + 5,
        size: 8,
        font,
        color: pdfColor,
      });
    } else if (item.type === 'area') {
      const pdfPoints = item.points.map(toPdfCoord);
      const n = pdfPoints.length;
      for (let i = 0; i < n; i++) {
        page.drawLine({
          start: pdfPoints[i],
          end: pdfPoints[(i + 1) % n],
          thickness: 1.5,
          color: pdfColor,
        });
      }

      // Center of polygon for badge placement
      let sumX = 0;
      let sumY = 0;
      for (const p of pdfPoints) {
        sumX += p.x;
        sumY += p.y;
      }
      const centerX = sumX / n;
      const centerY = sumY / n;

      const text = `Area: ${item.formattedString}`;
      const textWidth = font.widthOfTextAtSize(text, 8);

      page.drawRectangle({
        x: centerX - textWidth / 2 - 3,
        y: centerY - 5,
        width: textWidth + 6,
        height: 12,
        color: rgb(1, 1, 1),
        borderColor: pdfColor,
        borderWidth: 0.5,
        opacity: 0.9,
      });

      page.drawText(text, {
        x: centerX - textWidth / 2,
        y: centerY - 3,
        size: 8,
        font,
        color: pdfColor,
      });
    }
  }

  return await doc.save({ useObjectStreams: false });
}

/**
 * Serializes all takeoff measurements into an RFC 4180 CSV spreadsheet.
 */
export function exportTakeoffCsv(
  measurements: MeasurementItem[],
  calibration: CalibrationConfig
): string {
  const headers = ['ID', 'Label', 'Type', 'Value', 'Unit', 'Scale Ratio', 'Timestamp'];
  const rows: string[] = [headers.join(',')];

  const now = new Date().toISOString();
  const ratioStr = calibration.isCalibrated
    ? `1 pt = ${calibration.scaleRatio.toFixed(4)} ${calibration.unit}`
    : 'Uncalibrated (1 pt = 1 px)';

  for (const m of measurements) {
    const unitStr = m.type === 'area' ? `${calibration.unit}²` : calibration.unit;
    const cleanLabel = `"${m.label.replace(/"/g, '""')}"`;
    const row = [
      m.id,
      cleanLabel,
      m.type,
      m.realValue.toFixed(2),
      unitStr,
      `"${ratioStr}"`,
      `"${now}"`,
    ];
    rows.push(row.join(','));
  }

  return rows.join('\r\n');
}
