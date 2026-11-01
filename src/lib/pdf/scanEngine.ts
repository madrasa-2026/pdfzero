import { PDFDocument } from 'pdf-lib';

export interface Point2D {
  x: number;
  y: number;
}

export type ScanFilterType = 'none' | 'bw' | 'grayscale' | 'color-boost';

export interface ScanPageOptions {
  filter?: ScanFilterType;
  paperSize?: 'a4' | 'letter' | 'auto';
}

/**
 * Solves an 8x8 linear system A * x = b via Gaussian elimination with partial pivoting.
 */
export function solve8x8(A: number[][], b: number[]): number[] {
  const n = 8;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) {
        maxRow = k;
      }
    }

    // Swap rows
    const temp = M[i];
    M[i] = M[maxRow];
    M[maxRow] = temp;

    const pivot = M[i][i];
    if (Math.abs(pivot) < 1e-10) {
      throw new Error('Singular matrix in perspective homography calculation');
    }

    // Eliminate below and above
    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = M[k][i] / pivot;
        for (let j = i; j <= n; j++) {
          M[k][j] -= factor * M[i][j];
        }
      }
    }
  }

  const result = new Array(n);
  for (let i = 0; i < n; i++) {
    result[i] = M[i][n] / M[i][i];
  }
  return result;
}

/**
 * Computes the 3x3 backward homography matrix H that maps
 * destination rectangle coordinates (u, v) in [0..dstW] x [0..dstH]
 * back to source quadrilateral coordinates (x, y).
 */
export function computeBackwardHomography(
  srcQuad: [Point2D, Point2D, Point2D, Point2D], // [TL, TR, BR, BL]
  dstW: number,
  dstH: number
): number[] {
  const dstPts: Point2D[] = [
    { x: 0, y: 0 },
    { x: dstW, y: 0 },
    { x: dstW, y: dstH },
    { x: 0, y: dstH }
  ];

  const A: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    const u = dstPts[i].x;
    const v = dstPts[i].y;
    const x = srcQuad[i].x;
    const y = srcQuad[i].y;

    // Equation for x: h00*u + h01*v + h02 - h20*u*x - h21*v*x = x
    A.push([u, v, 1, 0, 0, 0, -u * x, -v * x]);
    b.push(x);

    // Equation for y: h10*u + h11*v + h12 - h20*u*y - h21*v*y = y
    A.push([0, 0, 0, u, v, 1, -u * y, -v * y]);
    b.push(y);
  }

  const h = solve8x8(A, b);
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1.0];
}

/**
 * Warps source RGBA pixels to destination RGBA pixels using backward homography with bilinear interpolation.
 */
export function warpPerspective(
  srcData: Uint8ClampedArray | Uint8Array,
  srcW: number,
  srcH: number,
  srcQuad: [Point2D, Point2D, Point2D, Point2D],
  dstW: number,
  dstH: number
): Uint8ClampedArray {
  const H = computeBackwardHomography(srcQuad, dstW, dstH);
  const dstData = new Uint8ClampedArray(dstW * dstH * 4);

  const h00 = H[0], h01 = H[1], h02 = H[2];
  const h10 = H[3], h11 = H[4], h12 = H[5];
  const h20 = H[6], h21 = H[7];

  for (let v = 0; v < dstH; v++) {
    const rowOffset = v * dstW * 4;
    for (let u = 0; u < dstW; u++) {
      const denom = h20 * u + h21 * v + 1.0;
      const x = (h00 * u + h01 * v + h02) / denom;
      const y = (h10 * u + h11 * v + h12) / denom;

      const dstIdx = rowOffset + (u * 4);

      if (x >= 0 && x < srcW - 1 && y >= 0 && y < srcH - 1) {
        const x0 = Math.floor(x);
        const y0 = Math.floor(y);
        const x1 = x0 + 1;
        const y1 = y0 + 1;

        const dx = x - x0;
        const dy = y - y0;
        const w00 = (1 - dx) * (1 - dy);
        const w10 = dx * (1 - dy);
        const w01 = (1 - dx) * dy;
        const w11 = dx * dy;

        const i00 = (y0 * srcW + x0) * 4;
        const i10 = (y0 * srcW + x1) * 4;
        const i01 = (y1 * srcW + x0) * 4;
        const i11 = (y1 * srcW + x1) * 4;

        dstData[dstIdx] = Math.round(w00 * srcData[i00] + w10 * srcData[i10] + w01 * srcData[i01] + w11 * srcData[i11]);
        dstData[dstIdx + 1] = Math.round(w00 * srcData[i00 + 1] + w10 * srcData[i10 + 1] + w01 * srcData[i01 + 1] + w11 * srcData[i11 + 1]);
        dstData[dstIdx + 2] = Math.round(w00 * srcData[i00 + 2] + w10 * srcData[i10 + 2] + w01 * srcData[i01 + 2] + w11 * srcData[i11 + 2]);
        dstData[dstIdx + 3] = 255;
      } else if (x >= 0 && x < srcW && y >= 0 && y < srcH) {
        // Edge pixel nearest neighbor fallback
        const nearestIdx = (Math.round(y) * srcW + Math.round(x)) * 4;
        dstData[dstIdx] = srcData[nearestIdx];
        dstData[dstIdx + 1] = srcData[nearestIdx + 1];
        dstData[dstIdx + 2] = srcData[nearestIdx + 2];
        dstData[dstIdx + 3] = 255;
      } else {
        // Outside bounds: white paper border
        dstData[dstIdx] = 255;
        dstData[dstIdx + 1] = 255;
        dstData[dstIdx + 2] = 255;
        dstData[dstIdx + 3] = 255;
      }
    }
  }

  return dstData;
}

/**
 * Applies document enhancement filters (B&W Photocopy, Grayscale, Color Boost).
 */
export function applyScanFilter(
  data: Uint8ClampedArray | Uint8Array,
  filter: ScanFilterType
): void {
  if (filter === 'none') return;

  const len = data.length;

  if (filter === 'grayscale') {
    for (let i = 0; i < len; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }
  } else if (filter === 'bw') {
    // High-contrast B&W document thresholding (Otsu / adaptive approximation)
    // First calculate mean luminance of the document
    let sumLum = 0;
    const pixelCount = len / 4;
    for (let i = 0; i < len; i += 4) {
      sumLum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    const meanLum = sumLum / pixelCount;
    // Bias threshold slightly below mean so text stays dark while shaded paper turns white
    const threshold = Math.max(90, Math.min(185, meanLum * 0.9));

    for (let i = 0; i < len; i += 4) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const val = lum >= threshold ? 255 : 0;
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
    }
  } else if (filter === 'color-boost') {
    // Contrast stretch and saturation boost
    for (let i = 0; i < len; i += 4) {
      // Contrast stretch: (c - 128) * 1.35 + 128 + 15 (brighten paper)
      let r = Math.round((data[i] - 128) * 1.35 + 128 + 15);
      let g = Math.round((data[i + 1] - 128) * 1.35 + 128 + 15);
      let b = Math.round((data[i + 2] - 128) * 1.35 + 128 + 15);

      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
    }
  }
}

/**
 * Creates a clean multi-page PDF document from an array of image bytes (JPEG or PNG).
 */
export async function createScannedPdf(
  pages: { imageBytes: Uint8Array; isPng?: boolean }[],
  paperSize: 'a4' | 'letter' | 'auto' = 'a4'
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  // Dimensions in points (72 pt per inch)
  const A4 = { width: 595.28, height: 841.89 };
  const LETTER = { width: 612, height: 792 };

  for (const page of pages) {
    const embeddedImage = page.isPng
      ? await pdfDoc.embedPng(page.imageBytes)
      : await pdfDoc.embedJpg(page.imageBytes);

    const imgWidth = embeddedImage.width;
    const imgHeight = embeddedImage.height;

    let targetWidth = imgWidth;
    let targetHeight = imgHeight;

    if (paperSize === 'a4') {
      const isLandscape = imgWidth > imgHeight;
      targetWidth = isLandscape ? A4.height : A4.width;
      targetHeight = isLandscape ? A4.width : A4.height;
    } else if (paperSize === 'letter') {
      const isLandscape = imgWidth > imgHeight;
      targetWidth = isLandscape ? LETTER.height : LETTER.width;
      targetHeight = isLandscape ? LETTER.width : LETTER.height;
    }

    const pdfPage = pdfDoc.addPage([targetWidth, targetHeight]);

    // Scale to fit neatly on page with slight margin if standard format
    if (paperSize === 'auto') {
      pdfPage.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width: targetWidth,
        height: targetHeight
      });
    } else {
      const margin = 18; // 0.25 inch margin
      const availWidth = targetWidth - margin * 2;
      const availHeight = targetHeight - margin * 2;

      const scale = Math.min(availWidth / imgWidth, availHeight / imgHeight);
      const renderW = imgWidth * scale;
      const renderH = imgHeight * scale;

      const posX = margin + (availWidth - renderW) / 2;
      const posY = margin + (availHeight - renderH) / 2;

      pdfPage.drawImage(embeddedImage, {
        x: posX,
        y: posY,
        width: renderW,
        height: renderH
      });
    }
  }

  return await pdfDoc.save();
}
