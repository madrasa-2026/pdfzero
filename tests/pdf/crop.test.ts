import { describe, it, expect } from 'vitest';
import { PDFDocument, rgb } from 'pdf-lib';
import { calculateCropBox, applyCropToPdf } from '../../src/lib/pdf/crop';

describe('PDF Crop & Margin Trimmer Engine', () => {
  it('calculates correct crop box coordinates from margins', () => {
    // 500 x 800 page, trim 50 from left, 30 from right, 40 from top, 20 from bottom
    const box = calculateCropBox(0, 0, 500, 800, {
      left: 50,
      right: 30,
      top: 40,
      bottom: 20,
    });

    expect(box.x).toBe(50);
    expect(box.y).toBe(20);
    expect(box.width).toBe(420); // 500 - 50 - 30
    expect(box.height).toBe(740); // 800 - 40 - 20
  });

  it('clamps dimensions when margins exceed page bounds', () => {
    const box = calculateCropBox(0, 0, 100, 100, {
      left: 80,
      right: 80,
      top: 10,
      bottom: 10,
    });

    expect(box.width).toBe(10); // Minimum clamped width
  });

  it('crops multi-page PDF and modifies CropBox/MediaBox vectors', async () => {
    const doc = await PDFDocument.create();
    for (let i = 0; i < 3; i++) {
      const page = doc.addPage([600, 800]);
      page.drawText(`Page ${i + 1}`, { x: 100, y: 700, size: 24, color: rgb(0, 0, 0) });
    }
    const inputBytes = await doc.save();

    const result = await applyCropToPdf(inputBytes, {
      margins: { top: 50, bottom: 50, left: 40, right: 40 },
      pageScope: 'all',
    });

    expect(result.pageCount).toBe(3);
    expect(result.pagesCropped).toBe(3);
    expect(result.newWidth).toBe(520);
    expect(result.newHeight).toBe(700);

    // Verify loaded PDF reflects new dimensions
    const verifyDoc = await PDFDocument.load(result.croppedBytes);
    const p1 = verifyDoc.getPage(0);
    expect(p1.getCropBox().width).toBe(520);
    expect(p1.getCropBox().height).toBe(700);
  });

  it('applies crop only to odd pages when specified', async () => {
    const doc = await PDFDocument.create();
    for (let i = 0; i < 4; i++) {
      doc.addPage([600, 800]);
    }
    const inputBytes = await doc.save();

    const result = await applyCropToPdf(inputBytes, {
      margins: { top: 60, bottom: 60, left: 50, right: 50 },
      pageScope: 'odd',
    });

    expect(result.pagesCropped).toBe(2); // Page 1 and Page 3

    const verifyDoc = await PDFDocument.load(result.croppedBytes);
    expect(verifyDoc.getPage(0).getCropBox().width).toBe(500); // Page 1 cropped
    expect(verifyDoc.getPage(1).getCropBox().width).toBe(600); // Page 2 untouched
    expect(verifyDoc.getPage(2).getCropBox().width).toBe(500); // Page 3 cropped
    expect(verifyDoc.getPage(3).getCropBox().width).toBe(600); // Page 4 untouched
  });
});
