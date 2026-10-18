import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { isPdfLinearized, linearizePdf } from '../../src/lib/pdf/linearize';

describe('PDF Linearization & Fast Web View Optimizer Engine', () => {
  it('correctly detects non-linearized documents', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([500, 500]);
    const bytes = await doc.save();

    expect(isPdfLinearized(bytes)).toBe(false);
  });

  it('restructures document and injects valid /Linearized parameter dictionary within first 1024 bytes', async () => {
    const doc = await PDFDocument.create();
    for (let i = 0; i < 4; i++) {
      const page = doc.addPage([600, 800]);
      page.drawText(`Page Content ${i + 1}`);
    }
    const inputBytes = await doc.save();

    const result = await linearizePdf(inputBytes);

    expect(result.pageCount).toBe(4);
    expect(result.isLinearized).toBe(true);
    expect(result.outputSize).toBeGreaterThan(0);
    expect(isPdfLinearized(result.outputBytes)).toBe(true);

    // Verify /Linearized appears in first 1024 bytes
    const first1024 = new TextDecoder('latin1').decode(result.outputBytes.subarray(0, 1024));
    expect(first1024).toContain('/Linearized 1');
    expect(first1024).toContain('/L ');
    expect(first1024).toContain('/N ');
  });

  it('ensures linearized output is structurally valid and loadable by PDFDocument', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([400, 600]);
    doc.addPage([400, 600]);
    const inputBytes = await doc.save();

    const result = await linearizePdf(inputBytes);
    const verifyDoc = await PDFDocument.load(result.outputBytes);

    expect(verifyDoc.getPageCount()).toBe(2);
    const p1 = verifyDoc.getPage(0);
    expect(p1.getWidth()).toBe(400);
    expect(p1.getHeight()).toBe(600);
  });
});
