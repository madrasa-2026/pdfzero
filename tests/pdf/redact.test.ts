import { describe, it, expect } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import {
  redactPdf,
  sanitizePdfMetadata,
  type RedactionOptions,
} from '../../src/lib/pdf/redact';

describe('True PDF Redactor & Metadata Sanitizer Engine', () => {
  it('permanently scrubs all metadata and document fingerprints', async () => {
    const doc = await PDFDocument.create();
    doc.setTitle('Classified Operation Memo');
    doc.setAuthor('Agent John Doe');
    doc.setProducer('Acme Legal PDF Engine');
    doc.setCreator('Internal Intel Tool');
    doc.setSubject('Top Secret Briefing');
    doc.setKeywords(['confidential', 'nda', 'classified']);

    const clearedCount = sanitizePdfMetadata(doc);
    expect(clearedCount).toBeGreaterThanOrEqual(5);

    expect(doc.getTitle()).toBeUndefined();
    expect(doc.getAuthor()).toBeUndefined();
    expect(doc.getProducer()).toBeUndefined();
    expect(doc.getCreator()).toBeUndefined();
    expect(doc.getSubject()).toBeUndefined();
    expect(doc.getKeywords()).toBeUndefined();
  });

  it('permanently eradicates sensitive text from content stream so it cannot be copied', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const page = doc.addPage([500, 500]);

    page.drawText('Public Header Notice', { x: 50, y: 400, font, size: 14 });
    page.drawText('Client Email: secret-partner@target.com', { x: 50, y: 350, font, size: 12 });
    page.drawText('Confidential Code: 9876', { x: 50, y: 320, font, size: 12 });
    page.drawText('Federal SSN: 000-12-3456', { x: 50, y: 290, font, size: 12 });

    const rawBytes = await doc.save({ useObjectStreams: false });

    // Execute True Redaction
    const result = await redactPdf(rawBytes, {
      customTerms: ['secret-partner', '9876'],
      redactEmails: true,
      redactSsns: true,
      sanitizeMetadata: true,
      maskColor: 'black',
    });

    expect(result.occurrencesRedacted).toBeGreaterThanOrEqual(3);

    // Verify string is permanently absent from reloaded binary
    const reloaded = await PDFDocument.load(result.redactedPdfBytes);
    expect(reloaded.getPageCount()).toBe(1);

    const binaryString = new TextDecoder('latin1').decode(result.redactedPdfBytes);
    expect(binaryString.includes('secret-partner@target.com')).toBe(false);
    expect(binaryString.includes('000-12-3456')).toBe(false);
    expect(binaryString.includes('9876')).toBe(false);
  });
});
