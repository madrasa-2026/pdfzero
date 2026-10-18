import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { splitSpreadPdf } from '../../src/lib/pdf/splitSpread';

describe('PDF Two-Page Spread Cutter Engine', () => {
  it('splits a 2-page landscape document into 4 portrait pages', async () => {
    const doc = await PDFDocument.create();
    for (let i = 1; i <= 2; i++) {
      const page = doc.addPage([800, 500]); // 800 x 500 landscape spread
      page.drawText(`Spread ${i}`, { x: 350, y: 250, size: 24 });
    }
    const inputBytes = await doc.save();

    const result = await splitSpreadPdf(inputBytes, {
      direction: 'vertical',
      readingOrder: 'ltr',
    });

    expect(result.inputPagesCount).toBe(2);
    expect(result.spreadsSplitCount).toBe(2);
    expect(result.outputPagesCount).toBe(4);

    const outDoc = await PDFDocument.load(result.pdfBytes);
    expect(outDoc.getPageCount()).toBe(4);

    // Each new page has width 400 (half of 800) and height 500
    const p1 = outDoc.getPage(0);
    expect(p1.getWidth()).toBe(400);
    expect(p1.getHeight()).toBe(500);
  });

  it('respects RTL reading order for Japanese Manga spreads', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([800, 500]);
    page.drawText('RIGHT SIDE (Panel 1)', { x: 500, y: 250, size: 16 });
    page.drawText('LEFT SIDE (Panel 2)', { x: 100, y: 250, size: 16 });
    const inputBytes = await doc.save();

    const result = await splitSpreadPdf(inputBytes, {
      direction: 'vertical',
      readingOrder: 'rtl',
    });

    expect(result.outputPagesCount).toBe(2);
    const outDoc = await PDFDocument.load(result.pdfBytes);
    expect(outDoc.getPageCount()).toBe(2);
  });

  it('preserves Page 1 as single cover when skip-first is selected', async () => {
    const doc = await PDFDocument.create();
    // Page 1: Single Front Cover (400 x 500)
    const cover = doc.addPage([400, 500]);
    cover.drawText('Book Front Cover', { x: 50, y: 250, size: 20 });

    // Page 2: Inside Spread (800 x 500)
    const spread = doc.addPage([800, 500]);
    spread.drawText('Page 1 & 2 Spread', { x: 300, y: 250, size: 20 });

    const inputBytes = await doc.save();

    const result = await splitSpreadPdf(inputBytes, {
      coverHandling: 'skip-first',
    });

    expect(result.inputPagesCount).toBe(2);
    expect(result.spreadsSplitCount).toBe(1); // only spread was split
    expect(result.outputPagesCount).toBe(3); // 1 cover + 2 split subpages

    const outDoc = await PDFDocument.load(result.pdfBytes);
    expect(outDoc.getPageCount()).toBe(3);
    expect(outDoc.getPage(0).getWidth()).toBe(400);
    expect(outDoc.getPage(1).getWidth()).toBe(400);
    expect(outDoc.getPage(2).getWidth()).toBe(400);
  });

  it('cuts pages horizontally into top and bottom halves', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([400, 800]); // 400 x 800 portrait
    page.drawText('Top Half', { x: 50, y: 600, size: 18 });
    page.drawText('Bottom Half', { x: 50, y: 200, size: 18 });
    const inputBytes = await doc.save();

    const result = await splitSpreadPdf(inputBytes, {
      direction: 'horizontal',
      onlyLandscape: false,
    });

    expect(result.outputPagesCount).toBe(2);
    const outDoc = await PDFDocument.load(result.pdfBytes);
    expect(outDoc.getPage(0).getHeight()).toBe(400);
    expect(outDoc.getPage(1).getHeight()).toBe(400);
  });

  it('removes spine gutter margin from center seam', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([800, 500]);
    const inputBytes = await doc.save();

    const result = await splitSpreadPdf(inputBytes, {
      direction: 'vertical',
      spineGutter: 20, // 20pt removed from center seam
    });

    const outDoc = await PDFDocument.load(result.pdfBytes);
    const p1 = outDoc.getPage(0);
    // 400 - 10 = 390
    expect(p1.getWidth()).toBe(390);
  });
});
