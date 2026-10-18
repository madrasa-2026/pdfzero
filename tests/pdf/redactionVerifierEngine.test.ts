import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  findIntersectingTextLeaks,
  detectDarkBoxesFromImageData,
  hardSanitizeRedactions,
  type TextSpan,
  type DarkBox,
} from '../../src/lib/pdf/redactionVerifierEngine';

describe('PDF Redaction Leak Verifier Engine', () => {
  it('detects text spans hidden beneath dark redaction boxes', () => {
    const textSpans: TextSpan[] = [
      { text: 'Confidential Secret Settlement $5M', x: 50, y: 100, width: 200, height: 16, pageNumber: 1 },
      { text: 'Public Non-Redacted Paragraph', x: 50, y: 300, width: 180, height: 16, pageNumber: 1 },
      { text: 'Other Page Secret', x: 50, y: 100, width: 100, height: 16, pageNumber: 2 },
    ];

    const darkBoxes: DarkBox[] = [
      { x: 40, y: 95, width: 220, height: 26, pageNumber: 1 }, // Covers span 0
    ];

    const leaks = findIntersectingTextLeaks(textSpans, darkBoxes);

    expect(leaks.length).toBe(1);
    expect(leaks[0].text).toBe('Confidential Secret Settlement $5M');
    expect(leaks[0].pageNumber).toBe(1);
  });

  it('detects black redaction bars from synthetic canvas pixel data', () => {
    const width = 100;
    const height = 60;
    // RGBA buffer initialized to white (255, 255, 255, 255)
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = 255;
    }

    // Draw a black redaction rectangle: x=10..60 (width=51), y=20..35 (height=16)
    for (let y = 20; y <= 35; y++) {
      for (let x = 10; x <= 60; x++) {
        const idx = (y * width + x) * 4;
        data[idx] = 0;     // R
        data[idx + 1] = 0; // G
        data[idx + 2] = 0; // B
        data[idx + 3] = 255; // A
      }
    }

    const boxes = detectDarkBoxesFromImageData(data, width, height, 1);
    expect(boxes.length).toBeGreaterThan(0);
    expect(boxes[0].x).toBe(10);
    expect(boxes[0].y).toBe(20);
    expect(boxes[0].width).toBe(51);
    expect(boxes[0].height).toBe(16);
  });

  it('hard-sanitizes PDF document by stamping opaque boxes and stripping metadata', async () => {
    const doc = await PDFDocument.create();
    doc.setTitle('Classified Evidence');
    doc.setAuthor('Attorney General');
    doc.addPage([600, 800]);

    const pdfBytes = await doc.save();

    const boxesToPurge: DarkBox[] = [
      { x: 50, y: 100, width: 200, height: 20, pageNumber: 1 },
    ];

    const sanitizedBytes = await hardSanitizeRedactions(pdfBytes, boxesToPurge);
    expect(sanitizedBytes.length).toBeGreaterThan(0);

    const verifiedDoc = await PDFDocument.load(sanitizedBytes);
    expect(verifiedDoc.getTitle()).toBe('');
    expect(verifiedDoc.getAuthor()).toBe('');
    expect(verifiedDoc.getProducer()).toBeDefined();
  });
});
