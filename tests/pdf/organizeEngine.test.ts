import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { reorganizePdfDocument, type PagePlan } from '../../src/lib/pdf/organizeEngine';

describe('PDF Visual Page Organizer Engine', () => {
  it('reorders and duplicates pages according to visual plan', async () => {
    const doc = await PDFDocument.create();
    const p0 = doc.addPage([500, 500]);
    p0.drawText('Page 0');
    const p1 = doc.addPage([500, 500]);
    p1.drawText('Page 1');
    const p2 = doc.addPage([500, 500]);
    p2.drawText('Page 2');

    const pdfBytes = await doc.save();

    // Plan: [p2, p0, p0 (duplicated), p1]
    const plan: PagePlan[] = [
      { sourcePageIndex: 2, rotationDegrees: 0 },
      { sourcePageIndex: 0, rotationDegrees: 0 },
      { sourcePageIndex: 0, rotationDegrees: 0 },
      { sourcePageIndex: 1, rotationDegrees: 0 },
    ];

    const resultBytes = await reorganizePdfDocument(pdfBytes, plan);
    const resultDoc = await PDFDocument.load(resultBytes);

    expect(resultDoc.getPageCount()).toBe(4);
  });

  it('rotates individual pages clockwise and counter-clockwise', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([600, 400]); // Page 0
    doc.addPage([600, 400]); // Page 1

    const pdfBytes = await doc.save();

    const plan: PagePlan[] = [
      { sourcePageIndex: 0, rotationDegrees: 90 },
      { sourcePageIndex: 1, rotationDegrees: 180 },
    ];

    const resultBytes = await reorganizePdfDocument(pdfBytes, plan);
    const resultDoc = await PDFDocument.load(resultBytes);

    expect(resultDoc.getPage(0).getRotation().angle).toBe(90);
    expect(resultDoc.getPage(1).getRotation().angle).toBe(180);
  });

  it('inserts blank divider pages seamlessly', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([600, 800]);

    const pdfBytes = await doc.save();

    const plan: PagePlan[] = [
      { sourcePageIndex: 0, rotationDegrees: 0 },
      { sourcePageIndex: -1, rotationDegrees: 0 }, // blank page
      { sourcePageIndex: 0, rotationDegrees: 0 },
    ];

    const resultBytes = await reorganizePdfDocument(pdfBytes, plan);
    const resultDoc = await PDFDocument.load(resultBytes);

    expect(resultDoc.getPageCount()).toBe(3);
    expect(resultDoc.getPage(1).getWidth()).toBe(600);
    expect(resultDoc.getPage(1).getHeight()).toBe(800);
  });

  it('throws descriptive error on empty reorganization plan', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([500, 500]);
    const pdfBytes = await doc.save();

    await expect(reorganizePdfDocument(pdfBytes, [])).rejects.toThrow(
      'Reorganization plan must specify at least one page.'
    );
  });
});
