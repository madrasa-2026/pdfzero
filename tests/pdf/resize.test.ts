import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  calculateFitBounds,
  resizePdfPages,
  STANDARD_PAPER_SIZES,
} from '../../src/lib/pdf/resize';

describe('PDF Page Resizer & Margin Expander Engine', () => {
  it('calculates proportional scale and centered coordinates without clipping', () => {
    // Fit Letter (612 x 792) into A4 (595.28 x 841.89)
    const bounds = calculateFitBounds(612, 792, 595.28, 841.89, 0);

    // Scaling is limited by width (595.28 / 612 ≈ 0.9726)
    expect(bounds.scale).toBeLessThan(1.0);
    expect(bounds.width).toBeLessThanOrEqual(595.28);
    expect(bounds.height).toBeLessThanOrEqual(841.89);
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
  });

  it('resizes a multi-page US Letter PDF to standard ISO A4 paper', async () => {
    const doc = await PDFDocument.create();
    for (let i = 0; i < 3; i++) {
      doc.addPage([612, 792]); // US Letter
    }
    const inputBytes = await doc.save();

    const result = await resizePdfPages(inputBytes, {
      preset: 'a4',
      strategy: 'fit',
      margin: 10,
    });

    expect(result.pageCount).toBe(3);
    expect(result.targetWidth).toBe(STANDARD_PAPER_SIZES.a4[0]);
    expect(result.targetHeight).toBe(STANDARD_PAPER_SIZES.a4[1]);
    expect(result.resizedBytes.length).toBeGreaterThan(0);

    const verifyDoc = await PDFDocument.load(result.resizedBytes);
    expect(verifyDoc.getPageCount()).toBe(3);
    const p1 = verifyDoc.getPage(0);
    expect(Math.round(p1.getWidth())).toBe(Math.round(STANDARD_PAPER_SIZES.a4[0]));
    expect(Math.round(p1.getHeight())).toBe(Math.round(STANDARD_PAPER_SIZES.a4[1]));
  });

  it('expands canvas margins without scaling original page content', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([500, 700]);
    const inputBytes = await doc.save();

    const result = await resizePdfPages(inputBytes, {
      strategy: 'expand',
      margin: 50, // +50 pt padding on all sides
    });

    expect(result.targetWidth).toBe(600); // 500 + 50*2
    expect(result.targetHeight).toBe(800); // 700 + 50*2

    const verifyDoc = await PDFDocument.load(result.resizedBytes);
    const p1 = verifyDoc.getPage(0);
    expect(p1.getWidth()).toBe(600);
    expect(p1.getHeight()).toBe(800);
  });
});
