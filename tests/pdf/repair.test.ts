import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib-with-encrypt';
import {
  sanitizePdfHeader,
  repairMissingEof,
  rebuildXrefTable,
  repairPdfBuffer,
} from '../../src/lib/pdf/repair';

describe('PDF Repair & Content Rescuer Engine', () => {
  it('sanitizePdfHeader removes leading server junk bytes and returns valid PDF offset', async () => {
    const validDoc = await PDFDocument.create();
    validDoc.addPage([200, 200]);
    const cleanBytes = await validDoc.save({ useObjectStreams: false });

    // Prepend junk HTTP response headers
    const junkPrefix = new TextEncoder().encode('HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n');
    const corruptedWithJunk = new Uint8Array(junkPrefix.length + cleanBytes.length);
    corruptedWithJunk.set(junkPrefix, 0);
    corruptedWithJunk.set(cleanBytes, junkPrefix.length);

    const result = sanitizePdfHeader(corruptedWithJunk);
    expect(result.fixed).toBe(true);
    expect(result.bytes[0]).toBe(0x25); // '%'
    expect(result.bytes[1]).toBe(0x50); // 'P'
    expect(result.bytes[2]).toBe(0x44); // 'D'
    expect(result.bytes[3]).toBe(0x46); // 'F'

    // Verify it loads now
    const loadedDoc = await PDFDocument.load(result.bytes);
    expect(loadedDoc.getPageCount()).toBe(1);
  });

  it('repairMissingEof reconstructs missing trailer and EOF marker', async () => {
    const validDoc = await PDFDocument.create();
    validDoc.addPage([200, 200]);
    const cleanBytes = await validDoc.save({ useObjectStreams: false });

    // Truncate the last 20 bytes (stripping %%EOF)
    const truncated = cleanBytes.slice(0, cleanBytes.length - 20);

    const result = repairMissingEof(truncated);
    expect(result.fixed).toBe(true);

    const str = new TextDecoder().decode(result.bytes);
    expect(str.includes('%%EOF')).toBe(true);
  });

  it('repairPdfBuffer fully repairs and salvages pages from corrupted buffers', async () => {
    const validDoc = await PDFDocument.create();
    validDoc.addPage([200, 200]);
    validDoc.addPage([300, 300]);
    const cleanBytes = await validDoc.save({ useObjectStreams: false });

    // Add leading junk AND strip trailing EOF
    const junkPrefix = new TextEncoder().encode('RANDOM_CORRUPTION_DATA_XYZ_123\n');
    const corrupted = new Uint8Array(junkPrefix.length + cleanBytes.length - 15);
    corrupted.set(junkPrefix, 0);
    corrupted.set(cleanBytes.slice(0, cleanBytes.length - 15), junkPrefix.length);

    const report = await repairPdfBuffer(corrupted, 'broken.pdf');
    expect(report.pagesRecovered).toBe(2);
    expect(report.fixesApplied.length).toBeGreaterThan(0);
    expect(report.isFullyRestored).toBe(true);

    // Verify output is a healthy PDF
    const repairedDoc = await PDFDocument.load(report.repairedBytes);
    expect(repairedDoc.getPageCount()).toBe(2);
  });
});
