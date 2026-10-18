import { describe, it, expect } from 'vitest';
import { PDFDocument, rgb } from 'pdf-lib';
import {
  resolveTargetPageIndices,
  applyPdfOverlay,
} from '../../src/lib/pdf/overlay';

describe('PDF Overlay & Letterhead Stamper Engine', () => {
  it('correctly resolves page targeting indices', () => {
    // 5 pages total (0-indexed: 0, 1, 2, 3, 4)
    expect(resolveTargetPageIndices(5, 'all')).toEqual([0, 1, 2, 3, 4]);
    expect(resolveTargetPageIndices(5, 'first')).toEqual([0]);
    // Odd pages (1, 3, 5 -> indices 0, 2, 4)
    expect(resolveTargetPageIndices(5, 'odd')).toEqual([0, 2, 4]);
    // Even pages (2, 4 -> indices 1, 3)
    expect(resolveTargetPageIndices(5, 'even')).toEqual([1, 3]);
    // Custom range: "1, 4-5" -> indices 0, 3, 4
    expect(resolveTargetPageIndices(5, 'custom', '1, 4-5')).toEqual([0, 3, 4]);
  });

  it('applies an overlay (foreground) stamp onto target PDF pages', async () => {
    // Create target document (2 pages)
    const targetDoc = await PDFDocument.create();
    targetDoc.addPage([500, 700]);
    targetDoc.addPage([500, 700]);
    const targetBytes = await targetDoc.save();

    // Create template stamp document (1 page with a stamp)
    const templateDoc = await PDFDocument.create();
    const stampPage = templateDoc.addPage([500, 700]);
    stampPage.drawText('CONFIDENTIAL', { x: 100, y: 350, size: 24, color: rgb(1, 0, 0) });
    const templateBytes = await templateDoc.save();

    const result = await applyPdfOverlay(targetBytes, templateBytes, {
      layer: 'overlay',
      target: 'all',
      opacity: 0.5,
    });

    expect(result.outputBytes).toBeInstanceOf(Uint8Array);
    expect(result.pagesModified).toBe(2);
    expect(result.layer).toBe('overlay');

    const outputDoc = await PDFDocument.load(result.outputBytes);
    expect(outputDoc.getPageCount()).toBe(2);
  });

  it('applies an underlay (background letterhead) behind target PDF pages', async () => {
    // Target document
    const targetDoc = await PDFDocument.create();
    const page = targetDoc.addPage([400, 600]);
    page.drawText('Invoice #1024 - Consulting Services', { x: 50, y: 500, size: 12 });
    const targetBytes = await targetDoc.save();

    // Template letterhead document
    const templateDoc = await PDFDocument.create();
    const letterhead = templateDoc.addPage([400, 600]);
    letterhead.drawRectangle({ x: 0, y: 550, width: 400, height: 50, color: rgb(0.1, 0.2, 0.4) });
    const templateBytes = await templateDoc.save();

    const result = await applyPdfOverlay(targetBytes, templateBytes, {
      layer: 'underlay',
      target: 'first',
    });

    expect(result.outputBytes).toBeInstanceOf(Uint8Array);
    expect(result.pagesModified).toBe(1);
    expect(result.layer).toBe('underlay');

    const outputDoc = await PDFDocument.load(result.outputBytes);
    expect(outputDoc.getPageCount()).toBe(1);
  });
});
