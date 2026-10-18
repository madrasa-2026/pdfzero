import { describe, it, expect } from 'vitest';
import { PDFDocument, rgb } from 'pdf-lib';
import {
  transformRgbForTheme,
  transformGrayForTheme,
  transformContentStreamForDarkMode,
  convertPdfToDarkMode,
  type DarkModeTheme,
} from '../../src/lib/pdf/darkMode';

describe('PDF Dark Mode & Color Inverter Engine', () => {
  it('correctly transforms RGB values for Midnight and OLED themes', () => {
    // Pure black text (0, 0, 0) should turn light in Midnight mode
    const [mr, mg, mb] = transformRgbForTheme(0, 0, 0, 'midnight');
    expect(mr).toBeGreaterThan(0.8);
    expect(mg).toBeGreaterThan(0.8);
    expect(mb).toBeGreaterThan(0.8);

    // Pure white background (1, 1, 1) should turn dark in Midnight mode
    const [bgR, bgG, bgB] = transformRgbForTheme(1, 1, 1, 'midnight');
    expect(bgR).toBeLessThan(0.15);
    expect(bgG).toBeLessThan(0.15);
    expect(bgB).toBeLessThan(0.15);

    // In OLED mode, black becomes pure white (1, 1, 1) and white becomes pure black (0, 0, 0)
    const [oledTextR, oledTextG, oledTextB] = transformRgbForTheme(0, 0, 0, 'oled');
    expect(oledTextR).toBe(1.0);
    expect(oledTextG).toBe(1.0);
    expect(oledTextB).toBe(1.0);

    const [oledBgR, oledBgG, oledBgB] = transformRgbForTheme(1, 1, 1, 'oled');
    expect(oledBgR).toBe(0.0);
    expect(oledBgG).toBe(0.0);
    expect(oledBgB).toBe(0.0);
  });

  it('transforms grayscale operators and content stream strings', () => {
    // Gray scale: 0 g (black text) should become light
    const lightGray = transformGrayForTheme(0.0, 'midnight');
    expect(lightGray).toBeGreaterThan(0.8);

    // Content stream sample with RGB and Gray operators
    const sampleStream = `
      0 0 0 rg
      /F1 12 Tf
      (Hello Dark Mode) Tj
      0.95 g
      10 10 100 100 re f
    `;

    const { newContent, opsCount } = transformContentStreamForDarkMode(sampleStream, 'midnight');
    expect(opsCount).toBeGreaterThanOrEqual(2);
    // Black rg operator should no longer be 0 0 0 rg
    expect(newContent).not.toContain('0.000 0.000 0.000 rg');
  });

  it('converts a PDF document into Dark Mode with prepended background', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([400, 600]);
    page.drawText('Reading at night with zero eye strain', {
      x: 50,
      y: 500,
      size: 14,
      color: rgb(0, 0, 0),
    });

    const pdfBytes = await doc.save();
    const result = await convertPdfToDarkMode(pdfBytes, {
      theme: 'midnight',
      invertImages: true,
    });

    expect(result.outputBytes).toBeInstanceOf(Uint8Array);
    expect(result.pagesProcessed).toBe(1);
    expect(result.outputBytes.length).toBeGreaterThan(0);

    // Load output and verify page dimensions and content
    const outputDoc = await PDFDocument.load(result.outputBytes);
    expect(outputDoc.getPageCount()).toBe(1);
    const outputPage = outputDoc.getPage(0);
    expect(outputPage.getWidth()).toBe(400);
    expect(outputPage.getHeight()).toBe(600);
  });
});
