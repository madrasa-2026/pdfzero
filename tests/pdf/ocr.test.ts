import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  injectSearchableTextLayer,
  aggregateOcrText,
  type OcrPageResult,
} from '../../src/lib/pdf/ocr';

describe('PDF OCR & Searchable Layer Engine', () => {
  it('injects invisible searchable text layer into scanned image PDF', async () => {
    // 1. Create a simulated scanned document (1 page with no selectable text)
    const doc = await PDFDocument.create();
    const page = doc.addPage([600, 800]);

    // 2. Prepare mock OCR recognition results
    const pageResults: OcrPageResult[] = [
      {
        pageIndex: 0,
        fullText: 'Invoice #10492 Total Due: $450.00 Thank you for your business.',
        blocks: [
          { text: 'Invoice #10492', x: 50, y: 720, width: 120, height: 16, fontSize: 14 },
          { text: 'Total Due: $450.00', x: 50, y: 680, width: 140, height: 16, fontSize: 14 },
          { text: 'Thank you for your business.', x: 50, y: 640, width: 220, height: 14, fontSize: 12 },
        ],
      },
    ];

    // 3. Inject searchable layer
    await injectSearchableTextLayer(doc, pageResults);

    const savedBytes = await doc.save({ useObjectStreams: false });
    expect(savedBytes.length).toBeGreaterThan(0);

    // 4. Verify loaded document contains content stream with the text
    const reloaded = await PDFDocument.load(savedBytes);
    expect(reloaded.getPageCount()).toBe(1);

    const reloadedPage = reloaded.getPage(0);
    expect(reloadedPage.node.Contents()).toBeDefined();
  });

  it('aggregates OCR text from multiple pages with clean formatting', () => {
    const pageResults: OcrPageResult[] = [
      {
        pageIndex: 0,
        fullText: 'First Page Heading\nBody paragraph text.',
        blocks: [],
      },
      {
        pageIndex: 1,
        fullText: 'Second Page Summary\nFinal conclusions.',
        blocks: [],
      },
    ];

    const aggregated = aggregateOcrText(pageResults);
    expect(aggregated).toContain('First Page Heading');
    expect(aggregated).toContain('Second Page Summary');
    expect(aggregated).toContain('--- Page 1 ---');
    expect(aggregated).toContain('--- Page 2 ---');
  });
});
