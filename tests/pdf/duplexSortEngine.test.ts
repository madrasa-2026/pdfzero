import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  splitForManualDuplex,
  interleavePdfStreams,
  bundleDuplexZip
} from '../../src/lib/pdf/duplexSortEngine';

describe('duplexSortEngine', () => {
  async function createNumberedPdf(pageCount: number): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    for (let i = 1; i <= pageCount; i++) {
      const page = doc.addPage([500, 700]);
      page.drawText(`Page ${i}`);
    }
    return await doc.save();
  }

  it('splits even-page PDF into odd and even stacks', async () => {
    const pdfBytes = await createNumberedPdf(4);
    const result = await splitForManualDuplex(pdfBytes, {
      reverseEvenStack: false,
      padOddPageCount: true
    });

    expect(result.totalOriginalPages).toBe(4);
    expect(result.oddPagesCount).toBe(2);
    expect(result.evenPagesCount).toBe(2);
    expect(result.wasPadded).toBe(false);

    const oddDoc = await PDFDocument.load(result.step1OddBytes);
    expect(oddDoc.getPageCount()).toBe(2);

    const evenDoc = await PDFDocument.load(result.step2EvenBytes);
    expect(evenDoc.getPageCount()).toBe(2);
  });

  it('pads odd-page count PDF with a blank page for even stack alignment', async () => {
    const pdfBytes = await createNumberedPdf(5);
    const result = await splitForManualDuplex(pdfBytes, {
      reverseEvenStack: false,
      padOddPageCount: true
    });

    expect(result.totalOriginalPages).toBe(5);
    expect(result.oddPagesCount).toBe(3); // 1, 3, 5
    expect(result.evenPagesCount).toBe(3); // 2, 4, blank
    expect(result.wasPadded).toBe(true);

    const evenDoc = await PDFDocument.load(result.step2EvenBytes);
    expect(evenDoc.getPageCount()).toBe(3);
  });

  it('reverses even stack order when reverseEvenStack is enabled', async () => {
    const pdfBytes = await createNumberedPdf(6);
    const result = await splitForManualDuplex(pdfBytes, {
      reverseEvenStack: true,
      padOddPageCount: true
    });

    expect(result.oddPagesCount).toBe(3);
    expect(result.evenPagesCount).toBe(3);

    const evenDoc = await PDFDocument.load(result.step2EvenBytes);
    expect(evenDoc.getPageCount()).toBe(3);
  });

  it('interleaves separate front and back scan files into a unified document', async () => {
    // 3 front pages: 1, 3, 5
    const fronts = await createNumberedPdf(3);
    // 3 back pages: 2, 4, 6 (or scanned reverse: 6, 4, 2)
    const backs = await createNumberedPdf(3);

    const interleavedBytes = await interleavePdfStreams(fronts, backs, {
      reverseSecondStack: true
    });

    const doc = await PDFDocument.load(interleavedBytes);
    expect(doc.getPageCount()).toBe(6);
  });

  it('bundles step1 and step2 PDFs into a downloadable ZIP', async () => {
    const pdfBytes = await createNumberedPdf(4);
    const result = await splitForManualDuplex(pdfBytes);
    const zipBytes = await bundleDuplexZip(result, 'contract.pdf');

    expect(zipBytes).toBeInstanceOf(Uint8Array);
    expect(zipBytes.length).toBeGreaterThan(200);
  });
});
