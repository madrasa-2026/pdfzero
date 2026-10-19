import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { stripOcrLayer } from '../../src/lib/pdf/stripOcrEngine';

describe('stripOcrEngine', () => {
  it('strips invisible 3 Tr OCR text blocks while keeping visible drawing operators', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([500, 700]);

    // Synthesize a content stream containing:
    // 1. Normal graphic operator (rectangle)
    // 2. Invisible OCR text block (BT ... 3 Tr ... ET)
    // 3. Normal visible text block (BT ... 0 Tr ... ET)
    const streamContent = `
q
0 0 100 100 re f
Q
BT
/F1 12 Tf
3 Tr
(Garbled Hallucinated OCR Text) Tj
ET
BT
/F1 12 Tf
0 Tr
(Keep This Visible Title) Tj
ET
`;
    const streamRef = doc.context.register(doc.context.flateStream(streamContent));
    page.node.set(doc.context.obj('Contents'), streamRef);

    const pdfBytes = await doc.save();

    // Run stripper in invisible-only mode
    const result = await stripOcrLayer(pdfBytes, { mode: 'invisible-only' });
    expect(result.pagesProcessed).toBe(1);
    expect(result.invisibleBlocksRemoved).toBeGreaterThan(0);

    // Verify document can still be loaded and rendered
    const cleanedDoc = await PDFDocument.load(result.pdfBytes);
    expect(cleanedDoc.getPageCount()).toBe(1);
  });

  it('strips all text blocks when mode is all-text', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([500, 700]);
    page.drawText('Some text that will be stripped');
    const pdfBytes = await doc.save();

    const result = await stripOcrLayer(pdfBytes, { mode: 'all-text' });
    expect(result.pagesProcessed).toBe(1);
    expect(result.cleanedSizeBytes).toBeGreaterThan(0);

    const cleanedDoc = await PDFDocument.load(result.pdfBytes);
    expect(cleanedDoc.getPageCount()).toBe(1);
  });
});
