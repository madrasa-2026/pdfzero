import { PDFDocument } from 'pdf-lib';

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface PdfCropBox {
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AutoCropOptions {
  mode: 'uniform' | 'per-page' | 'even-odd';
  padding: number; // in PDF points (72 pt = 1 inch)
  threshold?: number; // 0-255 brightness (default: 248)
}

/**
 * Scans an RGBA pixel array (from HTML5 Canvas getImageData) to detect the tightest
 * bounding box enclosing non-white/non-transparent pixels (ink/content).
 */
export function detectInkBoundingBoxFromImageData(
  data: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  threshold: number = 248
): BoundingBox | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  // Scan row by row to quickly identify vertical bounds
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width * 4;
    for (let x = 0; x < width; x++) {
      const idx = rowOffset + x * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      // A pixel is considered content if it is sufficiently opaque and darker than the threshold
      if (a > 30 && (r < threshold || g < threshold || b < threshold)) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // If page is completely blank
  if (maxX === -1 || maxY === -1) {
    return null;
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

/**
 * Converts top-left canvas pixel coordinates to bottom-left PDF 72pt coordinates,
 * applying safety margins and clamping to page bounds.
 */
export function canvasBoxToPdfBox(
  box: BoundingBox,
  canvasWidth: number,
  canvasHeight: number,
  pdfWidth: number,
  pdfHeight: number,
  padding: number = 10
): { x: number; y: number; width: number; height: number } {
  const scaleX = pdfWidth / canvasWidth;
  const scaleY = pdfHeight / canvasHeight;

  // Unpadded PDF coordinates (invert Y axis: PDF origin is bottom-left, canvas is top-left)
  const rawMinX = box.minX * scaleX;
  const rawMaxX = (box.maxX + 1) * scaleX;
  const rawMinY = (canvasHeight - (box.maxY + 1)) * scaleY;
  const rawMaxY = (canvasHeight - box.minY) * scaleY;

  // Apply padding margins
  const targetX = Math.max(0, rawMinX - padding);
  const targetY = Math.max(0, rawMinY - padding);
  const targetRight = Math.min(pdfWidth, rawMaxX + padding);
  const targetTop = Math.min(pdfHeight, rawMaxY + padding);

  const cropWidth = Math.max(20, targetRight - targetX);
  const cropHeight = Math.max(20, targetTop - targetY);

  return {
    x: Math.round(targetX * 100) / 100,
    y: Math.round(targetY * 100) / 100,
    width: Math.round(cropWidth * 100) / 100,
    height: Math.round(cropHeight * 100) / 100,
  };
}

/**
 * Calculates a unified union bounding box across multiple scanned page boxes
 * so every page shares identical dimensions (essential for e-readers like Kindle/Boox).
 */
export function computeUniformPdfCropBox(
  boxes: Array<{ width: number; height: number; crop: { x: number; y: number; width: number; height: number } }>,
  refPdfWidth: number,
  refPdfHeight: number
): { x: number; y: number; width: number; height: number } {
  if (boxes.length === 0) {
    return { x: 0, y: 0, width: refPdfWidth, height: refPdfHeight };
  }

  let minX = refPdfWidth;
  let minY = refPdfHeight;
  let maxRight = 0;
  let maxTop = 0;

  for (const b of boxes) {
    const right = b.crop.x + b.crop.width;
    const top = b.crop.y + b.crop.height;

    if (b.crop.x < minX) minX = b.crop.x;
    if (b.crop.y < minY) minY = b.crop.y;
    if (right > maxRight) maxRight = right;
    if (top > maxTop) maxTop = top;
  }

  const finalX = Math.max(0, minX);
  const finalY = Math.max(0, minY);
  const finalWidth = Math.min(refPdfWidth - finalX, Math.max(20, maxRight - finalX));
  const finalHeight = Math.min(refPdfHeight - finalY, Math.max(20, maxTop - finalY));

  return {
    x: Math.round(finalX * 100) / 100,
    y: Math.round(finalY * 100) / 100,
    width: Math.round(finalWidth * 100) / 100,
    height: Math.round(finalHeight * 100) / 100,
  };
}

/**
 * Applies the calculated crop boxes directly to the PDF pages' native `/CropBox`.
 * Preserves 100% vector typography, text search, and embedded fonts without rasterization.
 */
export async function applyAutoCrop(
  pdfBytes: Uint8Array,
  cropBoxesPerPage: PdfCropBox[]
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes);
  const pages = doc.getPages();

  const cropMap = new Map<number, PdfCropBox>();
  for (const c of cropBoxesPerPage) {
    cropMap.set(c.pageIndex, c);
  }

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const crop = cropMap.get(i);
    if (crop) {
      page.setCropBox(crop.x, crop.y, crop.width, crop.height);
    }
  }

  return await doc.save();
}
