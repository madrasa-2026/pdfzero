import { describe, it, expect } from 'vitest';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { inspectPdfDocument } from '../../src/lib/pdf/inspectEngine';

describe('PDF Forensic X-Ray & Deep Object Inspector Engine', () => {
  it('inspects clean PDF document with fonts, metadata, and content streams', async () => {
    const doc = await PDFDocument.create();
    doc.setTitle('Forensic Test Specimen');
    doc.setProducer('AirPDF Test Suite');
    doc.setCreator('Forensic Lab');

    const font = await doc.embedFont(StandardFonts.HelveticaBold);
    const page = doc.addPage([600, 400]);
    page.drawText('Sample Confidential Line', { x: 50, y: 350, size: 18, font, color: rgb(0.2, 0.2, 0.8) });

    const pdfBytes = await doc.save();
    const report = await inspectPdfDocument(pdfBytes);

    expect(report.summary.pageCount).toBe(1);
    expect(report.summary.fileSizeBytes).toBeGreaterThan(0);
    expect(report.summary.producer).toBeDefined();
    expect(report.summary.creator).toContain('Forensic Lab');
    expect(report.summary.isEncrypted).toBe(false);

    // Security check: should be clean
    expect(report.security.hasJavaScript).toBe(false);
    expect(report.security.hasLaunchActions).toBe(false);
    expect(report.security.hasEmbeddedFiles).toBe(false);
    expect(report.security.warnings.length).toBe(0);

    // Font check
    expect(report.fonts.length).toBeGreaterThan(0);
    const helvetica = report.fonts.find(f => f.name.includes('Helvetica'));
    expect(helvetica).toBeDefined();

    // Content stream sample
    expect(report.page1RawStreamSample).toBeDefined();
    expect(report.page1RawStreamSample).toContain('BT'); // Begin Text
    expect(report.page1RawStreamSample).toContain('ET'); // End Text
  });

  it('detects embedded JavaScript and incremental revisions in raw binary', async () => {
    // Construct synthetic PDF with JavaScript payload and multiple EOF markers
    const basePdf = `%PDF-1.7
1 0 obj
<< /Type /Catalog /Pages 2 0 R /Names << /JavaScript 4 0 R >> >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
4 0 obj
<< /JS (app.alert("Security Alert");) >>
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000088 00000 n 
0000000145 00000 n 
0000000219 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
272
%%EOF
%%EOF
`;
    const encoder = new TextEncoder();
    const bytes = encoder.encode(basePdf);

    const report = await inspectPdfDocument(bytes);
    expect(report.summary.pdfVersion).toBe('1.7');
    expect(report.security.hasJavaScript).toBe(true);
    expect(report.security.warnings.some(w => w.includes('JavaScript'))).toBe(true);
    expect(report.summary.revisionCount).toBe(2);
  });

  it('handles encrypted or corrupted documents gracefully with fallback diagnostics', async () => {
    const brokenBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x32, 0x2e, 0x30, 0x0a, 0x2f, 0x45, 0x6e, 0x63, 0x72, 0x79, 0x70, 0x74]); // %PDF-2.0 /Encrypt
    const report = await inspectPdfDocument(brokenBytes);

    expect(report.summary.pdfVersion).toBe('2.0');
    expect(report.security.isEncrypted).toBe(true);
    expect(report.security.warnings.length).toBeGreaterThan(0);
  });
});
