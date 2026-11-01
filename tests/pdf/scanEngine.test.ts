import { describe, it, expect } from 'vitest';
import {
  solve8x8,
  computeBackwardHomography,
  warpPerspective,
  applyScanFilter,
  createScannedPdf,
  type Point2D
} from '../../src/lib/pdf/scanEngine';
import { PDFDocument } from 'pdf-lib';

describe('Document Scanner & Perspective Warper Engine', () => {
  it('correctly solves 8x8 linear equation system', () => {
    // Identity system
    const A = Array.from({ length: 8 }, (_, i) =>
      Array.from({ length: 8 }, (_, j) => (i === j ? 1 : 0))
    );
    const b = [1, 2, 3, 4, 5, 6, 7, 8];
    const x = solve8x8(A, b);
    expect(x).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('computes backward homography matrix for rectangle mapping', () => {
    // Source quad is a 100x100 rectangle starting at (10, 20)
    const srcQuad: [Point2D, Point2D, Point2D, Point2D] = [
      { x: 10, y: 20 },
      { x: 110, y: 20 },
      { x: 110, y: 120 },
      { x: 10, y: 120 }
    ];
    const H = computeBackwardHomography(srcQuad, 100, 100);
    expect(H.length).toBe(9);
    // At u=0, v=0 -> x should be ~10, y should be ~20
    const x0 = (H[0] * 0 + H[1] * 0 + H[2]) / (H[6] * 0 + H[7] * 0 + 1);
    const y0 = (H[3] * 0 + H[4] * 0 + H[5]) / (H[6] * 0 + H[7] * 0 + 1);
    expect(Math.round(x0)).toBe(10);
    expect(Math.round(y0)).toBe(20);
  });

  it('warps synthetic pixel buffer with perspective transform', () => {
    const srcW = 20;
    const srcH = 20;
    const srcPixels = new Uint8ClampedArray(srcW * srcH * 4);
    // Fill with blue (0, 0, 255, 255)
    for (let i = 0; i < srcPixels.length; i += 4) {
      srcPixels[i] = 10;
      srcPixels[i + 1] = 50;
      srcPixels[i + 2] = 200;
      srcPixels[i + 3] = 255;
    }

    const srcQuad: [Point2D, Point2D, Point2D, Point2D] = [
      { x: 2, y: 2 },
      { x: 18, y: 3 },
      { x: 17, y: 18 },
      { x: 3, y: 17 }
    ];

    const dstW = 10;
    const dstH = 10;
    const warped = warpPerspective(srcPixels, srcW, srcH, srcQuad, dstW, dstH);

    expect(warped.length).toBe(dstW * dstH * 4);
    // Check center pixel is preserved
    const centerIdx = (5 * dstW + 5) * 4;
    expect(warped[centerIdx + 2]).toBeGreaterThan(150); // Blue channel preserved
    expect(warped[centerIdx + 3]).toBe(255);
  });

  it('applies B&W photocopy and grayscale document filters correctly', () => {
    // 2 pixels: one light gray (paper), one dark gray (ink)
    const pixels = new Uint8ClampedArray([
      220, 220, 220, 255, // Paper
      30, 30, 30, 255     // Ink
    ]);

    applyScanFilter(pixels, 'bw');
    // Paper should turn pure white (255) and ink pure black (0)
    expect(pixels[0]).toBe(255);
    expect(pixels[1]).toBe(255);
    expect(pixels[2]).toBe(255);

    expect(pixels[4]).toBe(0);
    expect(pixels[5]).toBe(0);
    expect(pixels[6]).toBe(0);
  });

  it('generates a multi-page scanned PDF from image bytes', async () => {
    // Create a 1x1 valid PNG
    // Minimal 1x1 PNG byte sequence
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const pngBytes = Uint8Array.from(atob(pngBase64), (c) => c.charCodeAt(0));

    const pdfBytes = await createScannedPdf(
      [
        { imageBytes: pngBytes, isPng: true },
        { imageBytes: pngBytes, isPng: true }
      ],
      'a4'
    );

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(500);

    const doc = await PDFDocument.load(pdfBytes);
    expect(doc.getPageCount()).toBe(2);
    const page1 = doc.getPage(0);
    // A4 width: 595.28, height: 841.89
    expect(Math.round(page1.getWidth())).toBe(595);
    expect(Math.round(page1.getHeight())).toBe(842);
  });
});
