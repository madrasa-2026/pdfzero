import { PDFDocument } from 'pdf-lib';

export interface CropMargins {
  top: number; // in points (1 inch = 72 pt, 1 mm ≈ 2.83 pt)
  bottom: number;
  left: number;
  right: number;
}

export type PageScope = 'all' | 'odd' | 'even' | 'custom';

export interface CropOptions {
  margins: CropMargins;
  pageScope?: PageScope;
  customPageList?: number[]; // 1-based page numbers
}

export interface CropResult {
  croppedBytes: Uint8Array;
  originalSize: number;
  outputSize: number;
  pageCount: number;
  pagesCropped: number;
  newWidth: number;
  newHeight: number;
}

/**
 * Calculates new crop rectangle coordinates from initial dimensions and margins
 */
export function calculateCropBox(
  origX: number,
  origY: number,
  origW: number,
  origH: number,
  margins: CropMargins
): { x: number; y: number; width: number; height: number } {
  const left = Math.max(0, margins.left || 0);
  const right = Math.max(0, margins.right || 0);
  const top = Math.max(0, margins.top || 0);
  const bottom = Math.max(0, margins.bottom || 0);

  const newW = Math.max(10, origW - left - right);
  const newH = Math.max(10, origH - top - bottom);
  const newX = origX + left;
  const newY = origY + bottom;

  return {
    x: Math.round(newX * 100) / 100,
    y: Math.round(newY * 100) / 100,
    width: Math.round(newW * 100) / 100,
    height: Math.round(newH * 100) / 100,
  };
}

/**
 * Applies crop box and media box to PDF document pages in memory
 */
export async function applyCropToPdf(
  inputBytes: Uint8Array,
  options: CropOptions
): Promise<CropResult> {
  const originalSize = inputBytes.length;
  const doc = await PDFDocument.load(inputBytes, { ignoreEncryption: true });
  const pageCount = doc.getPageCount();

  if (pageCount === 0) {
    throw new Error('PDF document contains no pages.');
  }

  const { margins, pageScope = 'all', customPageList = [] } = options;
  const customSet = new Set(customPageList);

  let pagesCropped = 0;
  let finalWidth = 0;
  let finalHeight = 0;

  for (let i = 0; i < pageCount; i++) {
    const pageNum = i + 1; // 1-based
    let shouldCrop = false;

    if (pageScope === 'all') {
      shouldCrop = true;
    } else if (pageScope === 'odd') {
      shouldCrop = pageNum % 2 !== 0;
    } else if (pageScope === 'even') {
      shouldCrop = pageNum % 2 === 0;
    } else if (pageScope === 'custom') {
      shouldCrop = customSet.has(pageNum);
    }

    if (shouldCrop) {
      const page = doc.getPage(i);
      const cropBox = page.getCropBox();
      const origX = cropBox?.x ?? 0;
      const origY = cropBox?.y ?? 0;
      const origW = cropBox?.width ?? page.getWidth();
      const origH = cropBox?.height ?? page.getHeight();

      const newBox = calculateCropBox(origX, origY, origW, origH, margins);

      page.setCropBox(newBox.x, newBox.y, newBox.width, newBox.height);
      page.setMediaBox(newBox.x, newBox.y, newBox.width, newBox.height);

      pagesCropped++;
      finalWidth = newBox.width;
      finalHeight = newBox.height;
    }
  }

  const croppedBytes = await doc.save({ useObjectStreams: false });

  return {
    croppedBytes,
    originalSize,
    outputSize: croppedBytes.length,
    pageCount,
    pagesCropped,
    newWidth: finalWidth,
    newHeight: finalHeight,
  };
}
