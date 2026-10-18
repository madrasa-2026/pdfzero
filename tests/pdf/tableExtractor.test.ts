import { describe, it, expect } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';

if (typeof Uint8Array !== 'undefined' && !('toHex' in Uint8Array.prototype)) {
  // @ts-ignore
  Uint8Array.prototype.toHex = function () {
    return Buffer.from(this).toString('hex');
  };
}

import {
  clusterRows,
  detectColumnBounds,
  formatRowsToGrid,
  serializeGridToCsv,
  extractTablesFromPdf,
  type TableTextItem,
} from '../../src/lib/pdf/tableExtractor';

describe('PDF to CSV / Table Extractor Engine', () => {
  it('clusters text items into rows based on vertical Y baseline', () => {
    const items: TableTextItem[] = [
      { text: 'Invoice', x: 50, y: 500, width: 40, height: 12 },
      { text: 'Date', x: 150, y: 501, width: 30, height: 12 }, // same line (within 2pt tolerance)
      { text: 'Amount', x: 250, y: 499.5, width: 45, height: 12 }, // same line
      { text: 'INV-001', x: 50, y: 470, width: 50, height: 12 }, // next line
      { text: '2026-10-18', x: 150, y: 470, width: 60, height: 12 },
      { text: '$1,250.00', x: 250, y: 470, width: 55, height: 12 },
    ];

    const rows = clusterRows(items, 4);
    expect(rows.length).toBe(2);
    expect(rows[0].items.length).toBe(3);
    expect(rows[0].items.map((i) => i.text)).toEqual(['Invoice', 'Date', 'Amount']);
    expect(rows[1].items.map((i) => i.text)).toEqual(['INV-001', '2026-10-18', '$1,250.00']);
  });

  it('detects column boundaries across rows and aligns into a 2D grid', () => {
    const items: TableTextItem[] = [
      { text: 'Item', x: 40, y: 300, width: 25, height: 12 },
      { text: 'Qty', x: 120, y: 300, width: 20, height: 12 },
      { text: 'Price', x: 200, y: 300, width: 30, height: 12 },
      { text: 'Widget A', x: 40, y: 280, width: 45, height: 12 },
      { text: '2', x: 120, y: 280, width: 10, height: 12 },
      { text: '$50.00', x: 200, y: 280, width: 35, height: 12 },
    ];

    const rows = clusterRows(items, 4);
    const colBounds = detectColumnBounds(rows);
    const grid = formatRowsToGrid(rows, colBounds);

    expect(grid.length).toBe(2);
    expect(grid[0]).toEqual(['Item', 'Qty', 'Price']);
    expect(grid[1]).toEqual(['Widget A', '2', '$50.00']);
  });

  it('serializes table grid to RFC 4180 compliant CSV format', () => {
    const grid = [
      ['Product Name', 'Description', 'Price'],
      ['Laptop, Pro', '15" Display', '$1,200.00'],
      ['Mouse', 'Ergonomic "Silent"', '$29.99'],
    ];

    const csv = serializeGridToCsv(grid);
    const lines = csv.split('\r\n');

    expect(lines[0]).toBe('Product Name,Description,Price');
    // Field with comma must be quoted: "Laptop, Pro"
    // Field with quotes must be escaped: "15"" Display"
    expect(lines[1]).toBe('"Laptop, Pro","15"" Display","$1,200.00"');
    expect(lines[2]).toBe('Mouse,"Ergonomic ""Silent""",$29.99');
  });

  it('extracts table from PDF bytes end-to-end', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const page = doc.addPage([500, 400]);

    // Draw header row
    page.drawText('Month', { x: 50, y: 350, size: 12, font });
    page.drawText('Revenue', { x: 180, y: 350, size: 12, font });
    page.drawText('Profit', { x: 300, y: 350, size: 12, font });

    // Draw row 1
    page.drawText('January', { x: 50, y: 320, size: 12, font });
    page.drawText('$10,000', { x: 180, y: 320, size: 12, font });
    page.drawText('$3,500', { x: 300, y: 320, size: 12, font });

    // Draw row 2
    page.drawText('February', { x: 50, y: 290, size: 12, font });
    page.drawText('$12,500', { x: 180, y: 290, size: 12, font });
    page.drawText('$4,200', { x: 300, y: 290, size: 12, font });

    const pdfBytes = await doc.save();
    const result = await extractTablesFromPdf(pdfBytes);

    expect(result.tables.length).toBeGreaterThan(0);
    expect(result.csv).toContain('Month');
    expect(result.csv).toContain('Revenue');
    expect(result.csv).toContain('January');
    expect(result.csv).toContain('February');
    expect(result.rowCount).toBeGreaterThanOrEqual(3);
  }, 15000);
});
