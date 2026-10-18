import { describe, it, expect } from 'vitest';
import { PDFDocument, rgb } from 'pdf-lib';
import {
  calculateSaddleStitchOrder,
  calculate2UpOrder,
  createBookletPdf,
} from '../../src/lib/pdf/booklet';

describe('PDF Booklet & Imposition Duplex Creator Engine', () => {
  it('correctly calculates 4-page saddle-stitch booklet order', () => {
    const { pairs, paddedCount } = calculateSaddleStitchOrder(4, 'ltr');
    expect(paddedCount).toBe(4);
    expect(pairs.length).toBe(2); // 1 sheet = 2 sides

    // Sheet 1 Front: [Page 4, Page 1]
    expect(pairs[0].side).toBe('front');
    expect(pairs[0].leftPage).toBe(4);
    expect(pairs[0].rightPage).toBe(1);

    // Sheet 1 Back: [Page 2, Page 3]
    expect(pairs[1].side).toBe('back');
    expect(pairs[1].leftPage).toBe(2);
    expect(pairs[1].rightPage).toBe(3);
  });

  it('correctly calculates 8-page saddle-stitch booklet order with RTL support', () => {
    const { pairs } = calculateSaddleStitchOrder(8, 'ltr');
    expect(pairs.length).toBe(4); // 2 sheets = 4 sides

    // Sheet 1 Front: [8, 1], Back: [2, 7]
    expect(pairs[0].leftPage).toBe(8);
    expect(pairs[0].rightPage).toBe(1);
    expect(pairs[1].leftPage).toBe(2);
    expect(pairs[1].rightPage).toBe(7);

    // Sheet 2 Front: [6, 3], Back: [4, 5]
    expect(pairs[2].leftPage).toBe(6);
    expect(pairs[2].rightPage).toBe(3);
    expect(pairs[3].leftPage).toBe(4);
    expect(pairs[3].rightPage).toBe(5);

    // RTL swap
    const rtl = calculateSaddleStitchOrder(8, 'rtl');
    expect(rtl.pairs[0].leftPage).toBe(1);
    expect(rtl.pairs[0].rightPage).toBe(8);
  });

  it('pads odd page counts with blank pages (e.g. 5 pages padded to 8)', () => {
    const { pairs, paddedCount } = calculateSaddleStitchOrder(5, 'ltr');
    expect(paddedCount).toBe(8);
    // Page 8, 7, 6 should be null (blank)
    expect(pairs[0].leftPage).toBeNull(); // was 8
    expect(pairs[0].rightPage).toBe(1);
    expect(pairs[1].leftPage).toBe(2);
    expect(pairs[1].rightPage).toBeNull(); // was 7
    expect(pairs[2].leftPage).toBeNull(); // was 6
    expect(pairs[2].rightPage).toBe(3);
    expect(pairs[3].leftPage).toBe(4);
    expect(pairs[3].rightPage).toBe(5);
  });

  it('creates an imposed booklet PDF from a source PDF document', async () => {
    const doc = await PDFDocument.create();
    for (let i = 1; i <= 4; i++) {
      const p = doc.addPage([300, 400]);
      p.drawText(`Page ${i}`, { x: 50, y: 350, size: 24, color: rgb(0, 0, 0) });
    }
    const inputBytes = await doc.save();

    const result = await createBookletPdf(inputBytes, {
      mode: 'booklet',
      gutter: 10,
      drawFoldLine: true,
    });

    expect(result.originalPageCount).toBe(4);
    expect(result.paddedPageCount).toBe(4);
    expect(result.sheetsGenerated).toBe(2); // 2 sides of 1 sheet
    expect(result.imposedBytes.length).toBeGreaterThan(0);

    // Verify output PDF page dimensions
    const verifyDoc = await PDFDocument.load(result.imposedBytes);
    expect(verifyDoc.getPageCount()).toBe(2);
    const firstSheet = verifyDoc.getPage(0);
    expect(firstSheet.getWidth()).toBe(300 * 2 + 10); // 610 pt
    expect(firstSheet.getHeight()).toBe(400); // 400 pt
  });
});
