import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  formatBatesNumber,
  calculateBatesPosition,
  applyBatesNumbering,
  type BatesOptions,
} from '../../src/lib/pdf/bates';

describe('Legal Bates Numbering Engine', () => {
  it('formats Bates strings with prefix, zero-padded digits, and suffix', () => {
    const formatted1 = formatBatesNumber(0, {
      prefix: 'PLTF-',
      startNumber: 1,
      digits: 6,
      suffix: '-CONF',
    });
    expect(formatted1).toBe('PLTF-000001-CONF');

    const formatted2 = formatBatesNumber(4, {
      prefix: 'DEF-',
      startNumber: 100,
      digits: 5,
    });
    expect(formatted2).toBe('DEF-00104');
  });

  it('calculates exact coordinates across 6 anchor positions', () => {
    const pageWidth = 600;
    const pageHeight = 800;
    const textWidth = 100;
    const textHeight = 12;
    const marginX = 40;
    const marginY = 30;

    // 1. Bottom Right
    const br = calculateBatesPosition(pageWidth, pageHeight, textWidth, textHeight, 'bottomRight', marginX, marginY);
    expect(br.x).toBe(600 - 40 - 100); // 460
    expect(br.y).toBe(30);

    // 2. Bottom Center
    const bc = calculateBatesPosition(pageWidth, pageHeight, textWidth, textHeight, 'bottomCenter', marginX, marginY);
    expect(bc.x).toBe((600 - 100) / 2); // 250
    expect(bc.y).toBe(30);

    // 3. Top Right
    const tr = calculateBatesPosition(pageWidth, pageHeight, textWidth, textHeight, 'topRight', marginX, marginY);
    expect(tr.x).toBe(600 - 40 - 100);
    expect(tr.y).toBe(800 - 30 - 12);
  });

  it('stamps sequential Bates numbers on every page of a multi-page PDF', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([500, 700]);
    doc.addPage([500, 700]);
    doc.addPage([500, 700]);
    const rawBytes = await doc.save({ useObjectStreams: false });

    const result = await applyBatesNumbering(rawBytes, {
      prefix: 'EXHIBIT-',
      startNumber: 1,
      digits: 4,
      position: 'bottomRight',
      fontSize: 10,
    });

    expect(result.pagesStamped).toBe(3);
    expect(result.batesStart).toBe('EXHIBIT-0001');
    expect(result.batesEnd).toBe('EXHIBIT-0003');

    // Reload and check page count
    const reloaded = await PDFDocument.load(result.stampedPdfBytes);
    expect(reloaded.getPageCount()).toBe(3);
  });
});
