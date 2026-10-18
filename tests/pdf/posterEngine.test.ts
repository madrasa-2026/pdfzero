import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { tilePosterPdf } from '../../src/lib/pdf/posterEngine';

describe('PDF Poster Maker & Multi-Sheet Tiler Engine', () => {
  it('tiles a single page across a 2x2 grid (4 sheets)', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([500, 700]);
    page.drawText('High School Science Fair Poster', { x: 50, y: 650, size: 24 });
    const inputBytes = await doc.save();

    const result = await tilePosterPdf(inputBytes, {
      columns: 2,
      rows: 2,
      paperSize: 'a4',
      overlap: 36,
      showCutLines: true,
      showTileNumbers: true,
    });

    expect(result.totalSheets).toBe(4);
    expect(result.columns).toBe(2);
    expect(result.rows).toBe(2);
    expect(result.posterDimensionsMm.width).toBeGreaterThan(300);
    expect(result.posterDimensionsMm.height).toBeGreaterThan(400);

    const outDoc = await PDFDocument.load(result.pdfBytes);
    expect(outDoc.getPageCount()).toBe(4);
  });

  it('tiles an asymmetric 3x2 grid (6 sheets)', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([1000, 600]);
    page.drawText('Panorama Wall Banner', { x: 100, y: 300, size: 30 });
    const inputBytes = await doc.save();

    const result = await tilePosterPdf(inputBytes, {
      columns: 3,
      rows: 2,
      paperSize: 'letter',
    });

    expect(result.totalSheets).toBe(6);
    expect(result.columns).toBe(3);
    expect(result.rows).toBe(2);

    const outDoc = await PDFDocument.load(result.pdfBytes);
    expect(outDoc.getPageCount()).toBe(6);
  });

  it('accurately reports real-world physical dimensions in mm and inches', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([400, 400]);
    const inputBytes = await doc.save();

    const result = await tilePosterPdf(inputBytes, {
      columns: 2,
      rows: 2,
      paperSize: 'a4',
      overlap: 36,
    });

    // 2 x A4 width (595.28) - 36 = 1154.56 pt
    // 1154.56 pt * 25.4 / 72 = 407.3 mm
    expect(result.posterDimensionsMm.width).toBeCloseTo(407, -1);
    expect(result.posterDimensionsInches.width).toBeGreaterThan(10);
  });

  it('throws error when columns or rows are less than 1', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([300, 300]);
    const bytes = await doc.save();

    await expect(tilePosterPdf(bytes, { columns: 0, rows: 2 })).rejects.toThrow(
      'Poster columns and rows must each be at least 1.'
    );
  });
});
