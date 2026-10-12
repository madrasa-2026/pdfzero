import { test, expect } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';

if (typeof Uint8Array !== 'undefined' && !('toHex' in Uint8Array.prototype)) {
  // @ts-ignore
  Uint8Array.prototype.toHex = function () {
    return Buffer.from(this).toString('hex');
  };
}

import * as pdfjsLib from 'pdfjs-dist';
import {
  extractPageTextItems,
  findTextMatches,
  type ExtractedTextItem,
} from '../../src/lib/pdf/textExtraction';

test('findTextMatches finds multiple matches case-insensitively with correct bounding boxes', () => {
  const items: ExtractedTextItem[] = [
    {
      id: 'p1-1',
      str: 'Hello world, hello universe',
      x: 100,
      y: 150,
      width: 200,
      height: 14,
      fontSize: 14,
      pageNumber: 1,
    },
    {
      id: 'p1-2',
      str: 'Nothing to see here',
      x: 100,
      y: 180,
      width: 150,
      height: 14,
      fontSize: 14,
      pageNumber: 1,
    },
  ];

  const matches = findTextMatches(items, 'Hello');
  expect(matches.length).toBe(2);
  expect(matches[0].matchStartIndex).toBe(0);
  expect(matches[0].matchEndIndex).toBe(5);
  expect(matches[0].box.x).toBe(100);
  expect(matches[0].box.height).toBe(14);

  expect(matches[1].matchStartIndex).toBe(13);
  expect(matches[1].box.x).toBeGreaterThan(100);
});

test('extractPageTextItems extracts text spans from PDF document proxy', async () => {
  // Create a 1-page PDF using pdf-lib
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const page = pdfDoc.addPage([600, 400]);
  page.drawText('AirPDF Editor Test Document', {
    x: 50,
    y: 350,
    size: 16,
    font,
  });
  const pdfBytes = await pdfDoc.save();

  // Load into pdfjs-dist
  const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
  const proxy = await loadingTask.promise;

  const items = await extractPageTextItems(proxy, 1);
  expect(items.length).toBeGreaterThan(0);
  const matched = items.find((it) => it.str.includes('AirPDF'));
  expect(matched).toBeDefined();
  expect(matched?.pageNumber).toBe(1);
  expect(matched?.x).toBeGreaterThanOrEqual(40);
  expect(matched?.fontSize).toBeCloseTo(16, 0);
});
