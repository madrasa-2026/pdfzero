import { describe, it, expect } from 'vitest';
import { PDFDocument, rgb } from 'pdf-lib';
import {
  calculateGray,
  calculateCmykGray,
  desaturateContentStreamString,
  convertToGrayscale,
} from '../../src/lib/pdf/grayscale';

describe('PDF Grayscale & Ink Saver Converter Engine', () => {
  it('correctly calculates luminance and applies toner reduction curves', () => {
    // Pure Red (0.299 * 1 = 0.299)
    const redGray = calculateGray(1, 0, 0, 'standard');
    expect(redGray).toBe(0.299);

    // Pure Green (0.587 * 1 = 0.587)
    const greenGray = calculateGray(0, 1, 0, 'standard');
    expect(greenGray).toBe(0.587);

    // Ink-saver mode lightens dark gray by 15%
    const inkSaver = calculateGray(0.2, 0.2, 0.2, 'ink-saver', 15);
    expect(inkSaver).toBeGreaterThan(0.2);

    // High contrast binarization
    expect(calculateGray(0.1, 0.1, 0.1, 'high-contrast')).toBe(0.0);
    expect(calculateGray(0.9, 0.9, 0.9, 'high-contrast')).toBe(1.0);
  });

  it('transforms vector RGB and CMYK color operators in stream content', () => {
    const mockStream = `
      q
      1 0 0 rg
      0 0 100 100 re f
      0 1 0 RG
      10 10 m 50 50 l S
      0.2 0.4 0.6 0.1 k
      Q
    `;

    const { newContent, conversionsCount } = desaturateContentStreamString(mockStream, 'standard');
    expect(conversionsCount).toBe(3);
    expect(newContent).toContain('0.299 g'); // Red converted to non-stroking gray
    expect(newContent).toContain('0.587 G'); // Green converted to stroking gray
    expect(newContent).not.toContain('rg');
    expect(newContent).not.toContain('RG');
  });

  it('converts a full multi-page PDF document to grayscale preserving vector structure', async () => {
    const doc = await PDFDocument.create();
    const page1 = doc.addPage([400, 600]);
    page1.drawRectangle({
      x: 50,
      y: 400,
      width: 200,
      height: 100,
      color: rgb(0.8, 0.2, 0.2), // Vibrant red fill
      borderColor: rgb(0.1, 0.2, 0.9), // Vibrant blue border
      borderWidth: 2,
    });

    const page2 = doc.addPage([400, 600]);
    page2.drawRectangle({
      x: 30,
      y: 300,
      width: 150,
      height: 80,
      color: rgb(0.2, 0.8, 0.3), // Vibrant green
    });

    const inputBytes = await doc.save();

    const result = await convertToGrayscale(inputBytes, { mode: 'ink-saver', lightenPercent: 20 });
    expect(result.pagesProcessed).toBe(2);
    expect(result.vectorOperatorsConverted).toBeGreaterThan(0);
    expect(result.convertedBytes.length).toBeGreaterThan(0);

    // Verify converted document can be loaded and read cleanly
    const verifyDoc = await PDFDocument.load(result.convertedBytes);
    expect(verifyDoc.getPageCount()).toBe(2);
  });
});
