import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { applyPrinterMarks } from '../../src/lib/pdf/printerMarksEngine';

describe('PDF Prepress Bleed, Trim & Registration Marks Engine', () => {
  it('expands page canvas by 2 * slugMargin and sets TrimBox and BleedBox', async () => {
    const doc = await PDFDocument.create();
    const p1 = doc.addPage([400, 600]);
    p1.drawText('Sample Print Artwork');

    const pdfBytes = await doc.save();

    const slugMargin = 36;
    const bleed = 9;

    const markedBytes = await applyPrinterMarks(pdfBytes, {
      slugMargin,
      bleed,
      includeTrimMarks: true,
      includeBleedMarks: true,
      includeRegistrationMarks: true,
      includeColorBars: true,
      includeSlugLine: true,
      fileName: 'poster.pdf',
    });

    const verifiedDoc = await PDFDocument.load(markedBytes);
    expect(verifiedDoc.getPageCount()).toBe(1);

    const outPage = verifiedDoc.getPage(0);
    // Page dimensions must be 400 + 72 = 472, 600 + 72 = 672
    expect(outPage.getWidth()).toBe(472);
    expect(outPage.getHeight()).toBe(672);

    const trimBox = outPage.getTrimBox();
    expect(trimBox.x).toBe(slugMargin);
    expect(trimBox.y).toBe(slugMargin);
    expect(trimBox.width).toBe(400);
    expect(trimBox.height).toBe(600);

    const bleedBox = outPage.getBleedBox();
    expect(bleedBox.x).toBe(slugMargin - bleed);
    expect(bleedBox.y).toBe(slugMargin - bleed);
    expect(bleedBox.width).toBe(400 + 2 * bleed);
    expect(bleedBox.height).toBe(600 + 2 * bleed);
  });

  it('handles multi-page documents seamlessly', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([500, 500]);
    doc.addPage([500, 500]);
    doc.addPage([500, 500]);

    const pdfBytes = await doc.save();

    const markedBytes = await applyPrinterMarks(pdfBytes, {
      slugMargin: 24,
      includeTrimMarks: true,
    });

    const verifiedDoc = await PDFDocument.load(markedBytes);
    expect(verifiedDoc.getPageCount()).toBe(3);
    expect(verifiedDoc.getPage(0).getWidth()).toBe(500 + 48);
  });
});
