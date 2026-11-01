import { describe, it, expect } from 'vitest';
import {
  generatePrintHtml,
  buildPdfFromCanvases,
  HTML_TEMPLATES
} from '../../src/lib/pdf/htmlEngine';
import { PDFDocument } from 'pdf-lib';

describe('HTML to PDF Engine', () => {
  it('generates self-contained print HTML with custom @page rules', () => {
    const html = '<h1>Hello World</h1>';
    const css = 'h1 { color: red; }';
    const result = generatePrintHtml(html, css, {
      paperSize: 'a4',
      orientation: 'landscape',
      margin: 'compact',
      printBackground: true,
      title: 'Test Invoice'
    });

    expect(result).toContain('<!DOCTYPE html>');
    expect(result).toContain('<title>Test Invoice</title>');
    expect(result).toContain('size: a4 landscape;');
    expect(result).toContain('margin: 10mm;');
    expect(result).toContain('-webkit-print-color-adjust: exact;');
    expect(result).toContain('h1 { color: red; }');
    expect(result).toContain('<h1>Hello World</h1>');
  });

  it('provides pre-built templates with valid HTML structure', () => {
    expect(HTML_TEMPLATES.invoice).toBeDefined();
    expect(HTML_TEMPLATES.invoice.html).toContain('INVOICE');
    expect(HTML_TEMPLATES.resume).toBeDefined();
    expect(HTML_TEMPLATES.resume.html).toContain('ALEXANDER WRIGHT');
    expect(HTML_TEMPLATES.report).toBeDefined();
    expect(HTML_TEMPLATES.report.html).toContain('Technical Whitepaper');
  });

  it('builds a standardized multi-page PDF document from canvas byte buffers', async () => {
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const pngBytes = Uint8Array.from(atob(pngBase64), (c) => c.charCodeAt(0));

    const pdfBytes = await buildPdfFromCanvases(
      [
        { imageBytes: pngBytes, isPng: true },
        { imageBytes: pngBytes, isPng: true }
      ],
      'letter',
      'portrait'
    );

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(400);

    const doc = await PDFDocument.load(pdfBytes);
    expect(doc.getPageCount()).toBe(2);
    const p1 = doc.getPage(0);
    expect(Math.round(p1.getWidth())).toBe(612);
    expect(Math.round(p1.getHeight())).toBe(792);
  });
});
