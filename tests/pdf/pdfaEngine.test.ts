import { describe, it, expect } from 'vitest';
import { PDFDocument, PDFName } from 'pdf-lib';
import { convertToPdfA, type PdfAProfile } from '../../src/lib/pdf/pdfaEngine';

describe('pdfaEngine', () => {
  async function createSamplePdf(): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    const p1 = doc.addPage([595, 842]); // A4
    p1.drawText('Sample Legal Document');
    const p2 = doc.addPage([595, 842]);
    p2.drawText('Page 2 Content');
    return await doc.save();
  }

  it('converts document to PDF/A-1b with valid OutputIntents and XMP metadata', async () => {
    const pdfBytes = await createSamplePdf();
    const result = await convertToPdfA(pdfBytes, {
      profile: 'PDF/A-1b',
      title: 'Court Submission 2026',
      author: 'Legal Counsel'
    });

    expect(result.profile).toBe('PDF/A-1b');
    expect(result.pagesCount).toBe(2);
    expect(result.pdfBytes).toBeInstanceOf(Uint8Array);
    expect(result.outputSizeBytes).toBeGreaterThan(0);

    // Verify PDF/A structures in reloaded document
    const reloaded = await PDFDocument.load(result.pdfBytes);
    const catalog = reloaded.catalog;

    // OutputIntent check
    const outputIntents = catalog.get(PDFName.of('OutputIntents'));
    expect(outputIntents).toBeDefined();

    // MarkInfo check
    const markInfo = catalog.get(PDFName.of('MarkInfo'));
    expect(markInfo).toBeDefined();

    // Metadata stream check
    const metadata = catalog.get(PDFName.of('Metadata'));
    expect(metadata).toBeDefined();
  });

  it('converts document to PDF/A-2b and PDF/A-3b profiles', async () => {
    const pdfBytes = await createSamplePdf();

    // PDF/A-2b
    const res2 = await convertToPdfA(pdfBytes, { profile: 'PDF/A-2b' });
    expect(res2.profile).toBe('PDF/A-2b');
    expect(res2.isoStandard).toBe('ISO 19005-2');

    // PDF/A-3b
    const res3 = await convertToPdfA(pdfBytes, { profile: 'PDF/A-3b' });
    expect(res3.profile).toBe('PDF/A-3b');
    expect(res3.isoStandard).toBe('ISO 19005-3');
  });
});
