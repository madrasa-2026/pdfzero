import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  getGridDimensions,
  parsePageRange,
  imposeNup,
} from '../../src/lib/pdf/nup';

describe('PDF N-Up Multi-Page Tile Imposer Engine', () => {
  it('correctly calculates grid rows and columns for all layouts', () => {
    // 2-up
    expect(getGridDimensions('2-up', true)).toEqual({ rows: 1, cols: 2, count: 2 });
    expect(getGridDimensions('2-up', false)).toEqual({ rows: 2, cols: 1, count: 2 });

    // 4-up (2x2)
    expect(getGridDimensions('4-up', true)).toEqual({ rows: 2, cols: 2, count: 4 });
    expect(getGridDimensions('4-up', false)).toEqual({ rows: 2, cols: 2, count: 4 });

    // 6-up
    expect(getGridDimensions('6-up', true)).toEqual({ rows: 2, cols: 3, count: 6 });
    expect(getGridDimensions('6-up', false)).toEqual({ rows: 3, cols: 2, count: 6 });

    // 8-up
    expect(getGridDimensions('8-up', true)).toEqual({ rows: 2, cols: 4, count: 8 });
    expect(getGridDimensions('8-up', false)).toEqual({ rows: 4, cols: 2, count: 8 });

    // 9-up (3x3)
    expect(getGridDimensions('9-up', true)).toEqual({ rows: 3, cols: 3, count: 9 });

    // 16-up (4x4)
    expect(getGridDimensions('16-up', true)).toEqual({ rows: 4, cols: 4, count: 16 });
  });

  it('correctly parses user page range specifications', () => {
    expect(parsePageRange('all', 10)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(parsePageRange('', 5)).toEqual([0, 1, 2, 3, 4]);
    expect(parsePageRange('1-3, 5, 7-8', 10)).toEqual([0, 1, 2, 4, 6, 7]);
    // Clamps to total page range
    expect(parsePageRange('1-20', 4)).toEqual([0, 1, 2, 3]);
  });

  it('imposes 8-page document into 2-up layout (4 sheets)', async () => {
    // Create synthetic 8-page test PDF
    const testDoc = await PDFDocument.create();
    for (let i = 1; i <= 8; i++) {
      const page = testDoc.addPage([400, 600]);
      page.drawText(`Page ${i}`, { x: 50, y: 300, size: 24 });
    }
    const pdfBytes = await testDoc.save();

    const result = await imposeNup(pdfBytes, {
      layout: '2-up',
      sheetSize: 'a4',
      orientation: 'landscape',
      margin: 20,
      spacing: 10,
    });

    expect(result.inputPagesProcessed).toBe(8);
    expect(result.sheetsGenerated).toBe(4);
    expect(result.layout).toBe('2-up');
    expect(result.pagesPerSheet).toBe(2);

    // Verify generated PDF structure
    const outputDoc = await PDFDocument.load(result.pdfBytes);
    expect(outputDoc.getPageCount()).toBe(4);
    // Landscape A4 width > height
    const firstSheet = outputDoc.getPage(0);
    expect(firstSheet.getWidth()).toBeGreaterThan(firstSheet.getHeight());
  });

  it('imposes 8-page document into 4-up layout with borders and cut marks (2 sheets)', async () => {
    const testDoc = await PDFDocument.create();
    for (let i = 1; i <= 8; i++) {
      const page = testDoc.addPage([500, 700]);
      page.drawText(`Page ${i}`, { x: 50, y: 350, size: 24 });
    }
    const pdfBytes = await testDoc.save();

    const result = await imposeNup(pdfBytes, {
      layout: '4-up',
      sheetSize: 'letter',
      drawBorders: true,
      drawCutMarks: true,
      order: 'horizontal',
    });

    expect(result.inputPagesProcessed).toBe(8);
    expect(result.sheetsGenerated).toBe(2);
    expect(result.pagesPerSheet).toBe(4);

    const outputDoc = await PDFDocument.load(result.pdfBytes);
    expect(outputDoc.getPageCount()).toBe(2);
  });

  it('respects page range filter and vertical page order', async () => {
    const testDoc = await PDFDocument.create();
    for (let i = 1; i <= 10; i++) {
      const page = testDoc.addPage([400, 500]);
      page.drawText(`Slide ${i}`, { x: 40, y: 250, size: 20 });
    }
    const pdfBytes = await testDoc.save();

    const result = await imposeNup(pdfBytes, {
      layout: '9-up',
      pageRange: '1-6',
      order: 'vertical',
      sheetSize: 'a3',
    });

    expect(result.inputPagesProcessed).toBe(6);
    expect(result.sheetsGenerated).toBe(1); // 6 items fits on 1 9-up sheet
    expect(result.pagesPerSheet).toBe(9);

    const outputDoc = await PDFDocument.load(result.pdfBytes);
    expect(outputDoc.getPageCount()).toBe(1);
  });

  it('gracefully handles blank pages without contents streams', async () => {
    const blankDoc = await PDFDocument.create();
    blankDoc.addPage([300, 300]); // Blank page without drawing
    const bytes = await blankDoc.save();

    const result = await imposeNup(bytes, { layout: '2-up' });
    expect(result.inputPagesProcessed).toBe(1);
    expect(result.sheetsGenerated).toBe(1);
  });

  it('throws error when page range contains no valid pages', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([300, 300]);
    const bytes = await doc.save();

    await expect(imposeNup(bytes, { pageRange: '50-60' })).rejects.toThrow(
      'No valid pages found in selected page range.'
    );
  });
});
