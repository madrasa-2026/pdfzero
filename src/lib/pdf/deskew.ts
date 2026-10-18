import { PDFDocument, PDFName, degrees } from 'pdf-lib';

export interface DeskewPdfOptions {
  globalAngleDegrees?: number; // Single angle applied to all pages
  pageAngles?: Record<number, number>; // Per-page angle map (1-based page number)
  expandCanvas?: boolean; // If true, expands sheet dimensions to prevent clipping of rotated corners
}

export interface DeskewResult {
  outputBytes: Uint8Array;
  originalSize: number;
  outputSize: number;
  pageCount: number;
  anglesApplied: Record<number, number>;
}

export interface RotatedBounds {
  width: number;
  height: number;
  drawX: number;
  drawY: number;
}

/**
 * Calculates page dimensions and draw coordinates for rotating around the center of the sheet
 */
export function calculateDeskewBounds(
  width: number,
  height: number,
  angleDeg: number,
  expandCanvas = false
): RotatedBounds {
  if (Math.abs(angleDeg) < 0.001) {
    return { width, height, drawX: 0, drawY: 0 };
  }

  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  if (expandCanvas) {
    // 4 corners of original page
    const corners = [
      [0, 0],
      [width, 0],
      [width, height],
      [0, height],
    ];

    const xPrime = corners.map(([x, y]) => x * cos - y * sin);
    const yPrime = corners.map(([x, y]) => x * sin + y * cos);

    const minX = Math.min(...xPrime);
    const minY = Math.min(...yPrime);
    const maxX = Math.max(...xPrime);
    const maxY = Math.max(...yPrime);

    const boxW = Math.round((maxX - minX) * 100) / 100;
    const boxH = Math.round((maxY - minY) * 100) / 100;

    return {
      width: boxW,
      height: boxH,
      drawX: Math.round(-minX * 100) / 100,
      drawY: Math.round(-minY * 100) / 100,
    };
  }

  // Keep original dimensions: rotate around center
  const cx = width / 2;
  const cy = height / 2;
  const rotCx = cx * cos - cy * sin;
  const rotCy = cx * sin + cy * cos;

  return {
    width,
    height,
    drawX: Math.round((cx - rotCx) * 100) / 100,
    drawY: Math.round((cy - rotCy) * 100) / 100,
  };
}

/**
 * Detects skew angle of a point cloud / binary edge map using horizontal projection profile variance
 */
export function detectSkewAngle(points: [number, number][]): number {
  if (points.length < 10) return 0;

  // Step 1: Coarse search from -10 deg to +10 deg in 1 deg increments
  let bestAngle = 0;
  let maxVariance = -1;

  for (let a = -10; a <= 10; a += 1.0) {
    const rad = (a * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const bins: Record<number, number> = {};
    for (const [px, py] of points) {
      const projY = Math.round(py * cos - px * sin);
      bins[projY] = (bins[projY] || 0) + 1;
    }

    const vals = Object.values(bins);
    if (vals.length === 0) continue;

    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    const variance = vals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / vals.length;

    if (variance > maxVariance) {
      maxVariance = variance;
      bestAngle = a;
    }
  }

  // Step 2: Fine search around the peak in 0.1 deg increments
  const fineMin = Math.max(-15, bestAngle - 1.5);
  const fineMax = Math.min(15, bestAngle + 1.5);
  let fineBestAngle = bestAngle;
  let fineMaxVariance = maxVariance;

  for (let a = fineMin; a <= fineMax; a += 0.1) {
    const rad = (a * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const bins: Record<number, number> = {};
    for (const [px, py] of points) {
      const projY = Math.round(py * cos - px * sin);
      bins[projY] = (bins[projY] || 0) + 1;
    }

    const vals = Object.values(bins);
    if (vals.length === 0) continue;

    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    const variance = vals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / vals.length;

    if (variance > fineMaxVariance) {
      fineMaxVariance = variance;
      fineBestAngle = Math.round(a * 10) / 10;
    }
  }

  // Inverse angle represents correction needed
  return -fineBestAngle;
}

/**
 * Straightens/deskews pages of a PDF document
 */
export async function applyDeskewToPdf(
  inputBytes: Uint8Array,
  options: DeskewPdfOptions = {}
): Promise<DeskewResult> {
  const originalSize = inputBytes.length;
  const srcDoc = await PDFDocument.load(inputBytes, { ignoreEncryption: true });
  const pageCount = srcDoc.getPageCount();

  if (pageCount === 0) {
    throw new Error('PDF document contains no pages.');
  }

  // Ensure all pages have a Contents stream
  srcDoc.getPages().forEach((p) => {
    if (!p.node.Contents()) {
      const emptyStream = srcDoc.context.stream('');
      const emptyRef = srcDoc.context.register(emptyStream);
      p.node.set(PDFName.of('Contents'), emptyRef);
    }
  });

  const {
    globalAngleDegrees = 0,
    pageAngles = {},
    expandCanvas = false,
  } = options;

  const destDoc = await PDFDocument.create();
  const embeddedPages = await destDoc.embedPdf(srcDoc, srcDoc.getPageIndices());

  const anglesApplied: Record<number, number> = {};

  for (let i = 0; i < pageCount; i++) {
    const pageNum = i + 1;
    const angle = pageAngles[pageNum] !== undefined ? pageAngles[pageNum] : globalAngleDegrees;
    anglesApplied[pageNum] = angle;

    const srcPage = srcDoc.getPage(i);
    const srcW = srcPage.getWidth();
    const srcH = srcPage.getHeight();

    const bounds = calculateDeskewBounds(srcW, srcH, angle, expandCanvas);

    const sheet = destDoc.addPage([bounds.width, bounds.height]);

    sheet.drawPage(embeddedPages[i], {
      x: bounds.drawX,
      y: bounds.drawY,
      width: srcW,
      height: srcH,
      rotate: degrees(angle),
    });
  }

  const outputBytes = await destDoc.save({ useObjectStreams: false });

  return {
    outputBytes,
    originalSize,
    outputSize: outputBytes.length,
    pageCount,
    anglesApplied,
  };
}
