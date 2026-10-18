import { describe, it, expect } from 'vitest';
import { PDFDocument, rgb } from 'pdf-lib';
import {
  detectInkBoundingBoxFromImageData,
  canvasBoxToPdfBox,
  computeUniformPdfCropBox,
  applyAutoCrop,
} from '../../src/lib/pdf/autoCropEngine';

describe('Auto-Crop & Ink Detector Engine', () => {
  it('detects ink bounding box from synthetic canvas RGBA image data', () => {
    const width = 100;
    const height = 100;
    // 100x100 white canvas (RGBA: 255, 255, 255, 255)
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = 255;
    }

    // Draw a black block from x=20..40, y=30..60
    for (let y = 30; y <= 60; y++) {
      for (let x = 20; x <= 40; x++) {
        const idx = (y * width + x) * 4;
        data[idx] = 0;     // R
        data[idx + 1] = 0; // G
        data[idx + 2] = 0; // B
        data[idx + 3] = 255; // A
      }
    }

    const box = detectInkBoundingBoxFromImageData(data, width, height, 248);
    expect(box).not.toBeNull();
    expect(box?.minX).toBe(20);
    expect(box?.maxX).toBe(40);
    expect(box?.minY).toBe(30);
    expect(box?.maxY).toBe(60);
    expect(box?.width).toBe(21);
    expect(box?.height).toBe(31);
  });

  it('returns null when canvas image is completely blank white', () => {
    const width = 50;
    const height = 50;
    const data = new Uint8ClampedArray(width * height * 4);
    data.fill(255); // completely white

    const box = detectInkBoundingBoxFromImageData(data, width, height, 248);
    expect(box).toBeNull();
  });

  it('converts canvas pixel bounding box to bottom-left PDF 72pt coordinates with padding', () => {
    const canvasWidth = 200;
    const canvasHeight = 200;
    const pdfWidth = 400; // scale 2.0
    const pdfHeight = 400;

    // Canvas box: x from 50 to 150, y from 40 to 140
    const box = {
      minX: 50,
      minY: 40,
      maxX: 150,
      maxY: 140,
      width: 101,
      height: 101,
    };

    const pdfBox = canvasBoxToPdfBox(box, canvasWidth, canvasHeight, pdfWidth, pdfHeight, 10);
    // rawMinX = 50 * 2 = 100 -> padding: 100 - 10 = 90
    expect(pdfBox.x).toBe(90);
    // rawMaxX = 151 * 2 = 302 -> padding: 302 + 10 = 312
    // width = 312 - 90 = 222
    expect(pdfBox.width).toBe(222);

    // rawMinY in PDF = (200 - 141) * 2 = 59 * 2 = 118 -> padding: 118 - 10 = 108
    expect(pdfBox.y).toBe(108);
    // rawMaxY in PDF = (200 - 40) * 2 = 160 * 2 = 320 -> padding: 320 + 10 = 330
    // height = 330 - 108 = 222
    expect(pdfBox.height).toBe(222);
  });

  it('computes uniform bounding box across multiple page crops', () => {
    const boxes = [
      { width: 500, height: 700, crop: { x: 50, y: 80, width: 350, height: 500 } },
      { width: 500, height: 700, crop: { x: 30, y: 100, width: 400, height: 480 } },
    ];

    const uniform = computeUniformPdfCropBox(boxes, 500, 700);
    // minX should be min(50, 30) = 30
    expect(uniform.x).toBe(30);
    // minY should be min(80, 100) = 80
    expect(uniform.y).toBe(80);
    // maxRight = max(50+350=400, 30+400=430) = 430 -> width = 430 - 30 = 400
    expect(uniform.width).toBe(400);
  });

  it('applies crop boxes to real PDF document and preserves valid structure', async () => {
    const doc = await PDFDocument.create();
    const page1 = doc.addPage([600, 800]);
    page1.drawText('Page 1 Content with large white margins', { x: 100, y: 700, size: 16 });

    const page2 = doc.addPage([600, 800]);
    page2.drawText('Page 2 Content', { x: 120, y: 650, size: 16 });

    const pdfBytes = await doc.save();

    const cropBoxes = [
      { pageIndex: 0, x: 80, y: 680, width: 400, height: 100 },
      { pageIndex: 1, x: 100, y: 630, width: 380, height: 120 },
    ];

    const croppedBytes = await applyAutoCrop(pdfBytes, cropBoxes);
    expect(croppedBytes.length).toBeGreaterThan(0);

    const verifiedDoc = await PDFDocument.load(croppedBytes);
    expect(verifiedDoc.getPageCount()).toBe(2);

    const p1Crop = verifiedDoc.getPage(0).getCropBox();
    expect(p1Crop.x).toBe(80);
    expect(p1Crop.y).toBe(680);
    expect(p1Crop.width).toBe(400);
    expect(p1Crop.height).toBe(100);

    const p2Crop = verifiedDoc.getPage(1).getCropBox();
    expect(p2Crop.x).toBe(100);
    expect(p2Crop.y).toBe(630);
    expect(p2Crop.width).toBe(380);
    expect(p2Crop.height).toBe(120);
  });
});
