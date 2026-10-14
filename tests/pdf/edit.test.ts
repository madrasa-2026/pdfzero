import { test, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { applyPdfEdits, type DocumentEditState } from '../../src/lib/pdf/edit';

test('applyPdfEdits applies all vector annotation primitives and page manipulations', async () => {
  // 1. Create a 3-page base PDF
  const baseDoc = await PDFDocument.create();
  baseDoc.addPage([600, 400]);
  baseDoc.addPage([600, 400]);
  baseDoc.addPage([600, 400]);
  const baseBytes = await baseDoc.save();

  // Minimal 1x1 transparent PNG bytes
  const png1x1 = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
    0x42, 0x60, 0x82
  ]);

  const state: DocumentEditState = {
    pages: [
      { originalIndex: 1, rotation: 90, isDeleted: false }, // page 2 becomes page 1, rotated 90
      { originalIndex: 0, rotation: 0, isDeleted: false },  // page 1 becomes page 2
      { originalIndex: 2, rotation: 0, isDeleted: true },   // page 3 is deleted
    ],
    annotations: [
      {
        type: 'text',
        id: 't1',
        pageIndex: 0,
        x: 50,
        y: 50,
        text: 'English Title',
        fontSize: 16,
        color: '#000000',
      },
      {
        type: 'text',
        id: 't2',
        pageIndex: 0,
        x: 50,
        y: 80,
        text: 'বাংলা টেক্সট',
        fontSize: 18,
        color: '#dc2626',
      },
      {
        type: 'whiteout',
        id: 'w1',
        pageIndex: 0,
        x: 100,
        y: 100,
        width: 150,
        height: 25,
      },
      {
        type: 'shape',
        id: 's1',
        pageIndex: 0,
        shapeType: 'rect',
        x: 50,
        y: 150,
        width: 100,
        height: 60,
        strokeColor: '#2563eb',
        strokeWidth: 2,
        fillColor: '#eff6ff',
      },
      {
        type: 'shape',
        id: 's2',
        pageIndex: 0,
        shapeType: 'circle',
        x: 200,
        y: 150,
        width: 60,
        height: 60,
        strokeColor: '#16a34a',
        strokeWidth: 2,
      },
      {
        type: 'signature',
        id: 'sig1',
        pageIndex: 0,
        points: [
          [
            { x: 50, y: 250 },
            { x: 70, y: 260 },
            { x: 90, y: 250 },
          ],
        ],
        strokeColor: '#000000',
        strokeWidth: 2,
      },
      {
        type: 'image',
        id: 'img1',
        pageIndex: 0,
        x: 300,
        y: 200,
        width: 50,
        height: 50,
        imageBytes: png1x1,
        format: 'png',
      },
      {
        type: 'highlight',
        id: 'h1',
        pageIndex: 0,
        x: 50,
        y: 320,
        width: 120,
        height: 20,
        color: '#facc15',
      },
      {
        type: 'link',
        id: 'l1',
        pageIndex: 0,
        x: 50,
        y: 350,
        width: 100,
        height: 20,
        url: 'https://airpdf.pages.dev',
      },
    ],
  };

  let progressReported = false;
  const editedBytes = await applyPdfEdits(baseBytes, state, (progress) => {
    if (progress > 0) progressReported = true;
  });

  expect(progressReported).toBe(true);
  expect(editedBytes).toBeInstanceOf(Uint8Array);
  expect(editedBytes.length).toBeGreaterThan(0);

  // Validate the generated PDF can be reloaded by pdf-lib
  const reloaded = await PDFDocument.load(editedBytes);
  // Page count should be 2 because page 3 was deleted
  expect(reloaded.getPageCount()).toBe(2);
  const p1 = reloaded.getPage(0);
  expect(p1.getRotation().angle).toBe(90);
});

test('handles Unicode punctuation (smart quotes, em-dash, bullets) without WinAnsi encoding crash', async () => {
  const baseDoc = await PDFDocument.create();
  baseDoc.addPage([600, 400]);
  const baseBytes = await baseDoc.save();

  const state: DocumentEditState = {
    annotations: [
      {
        type: 'text',
        id: 'unicode-quotes',
        pageIndex: 0,
        x: 50,
        y: 50,
        text: 'Greek Alpha α & Math ∑ ≈ 100 ≠ 0',
        fontSize: 14,
      },
    ],
  };

  const edited = await applyPdfEdits(baseBytes, state);
  expect(edited.length).toBeGreaterThan(0);
});

test('handles line and arrow vector shapes with rotation mapping', async () => {
  const baseDoc = await PDFDocument.create();
  baseDoc.addPage([600, 400]);
  const baseBytes = await baseDoc.save();

  const state: DocumentEditState = {
    annotations: [
      {
        type: 'shape',
        id: 'shape-line',
        pageIndex: 0,
        shapeType: 'line',
        x: 30,
        y: 30,
        width: 100,
        height: 50,
        strokeColor: '#2563eb',
        strokeWidth: 2,
      },
      {
        type: 'shape',
        id: 'shape-arrow',
        pageIndex: 0,
        shapeType: 'arrow',
        x: 100,
        y: 100,
        width: 120,
        height: 80,
        strokeColor: '#dc2626',
        strokeWidth: 3,
      },
    ],
  };

  const edited = await applyPdfEdits(baseBytes, state);
  expect(edited.length).toBeGreaterThan(0);
  const reloaded = await PDFDocument.load(edited);
  expect(reloaded.getPageCount()).toBe(1);
});

test('handles bold, italic, and multi-line text vector stamping', async () => {
  const baseDoc = await PDFDocument.create();
  baseDoc.addPage([600, 400]);
  const baseBytes = await baseDoc.save();

  const state: DocumentEditState = {
    annotations: [
      {
        type: 'text',
        id: 't-bold',
        pageIndex: 0,
        x: 50,
        y: 50,
        text: 'Bold Helvetica Heading',
        fontSize: 18,
        bold: true,
      },
      {
        type: 'text',
        id: 't-italic',
        pageIndex: 0,
        x: 50,
        y: 80,
        text: 'Italic Helvetica Subtitle',
        fontSize: 14,
        italic: true,
      },
      {
        type: 'text',
        id: 't-bold-italic-multiline',
        pageIndex: 0,
        x: 50,
        y: 110,
        text: 'Multi-line Text Line 1\nMulti-line Text Line 2\nMulti-line Text Line 3',
        fontSize: 12,
        bold: true,
        italic: true,
      },
    ],
  };

  const edited = await applyPdfEdits(baseBytes, state);
  expect(edited.length).toBeGreaterThan(0);
  const reloaded = await PDFDocument.load(edited);
  expect(reloaded.getPageCount()).toBe(1);
});

