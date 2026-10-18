import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  extractEmbeddedFonts,
  createFontsZip,
  cleanFontFamilyName,
  detectFontFormat
} from '../../src/lib/pdf/fontExtractorEngine';

describe('fontExtractorEngine', () => {
  it('cleans font family name by stripping 6-letter subset prefixes', () => {
    expect(cleanFontFamilyName('ABCDEF+Roboto-Bold')).toBe('Roboto-Bold');
    expect(cleanFontFamilyName('/XYZABC+OpenSans-Regular')).toBe('OpenSans-Regular');
    expect(cleanFontFamilyName('/Helvetica-Bold')).toBe('Helvetica-Bold');
    expect(cleanFontFamilyName('MyCustomFont')).toBe('MyCustomFont');
  });

  it('detects font formats from magic bytes', () => {
    // TTF magic: 0x00 0x01 0x00 0x00
    const ttfBytes = new Uint8Array([0x00, 0x01, 0x00, 0x00, 0x00, 0x10]);
    expect(detectFontFormat(ttfBytes)).toBe('ttf');

    // OTF magic: 'OTTO' (0x4F, 0x54, 0x54, 0x4F)
    const otfBytes = new Uint8Array([0x4F, 0x54, 0x54, 0x4F, 0x00, 0x10]);
    expect(detectFontFormat(otfBytes)).toBe('otf');

    // WOFF magic: 'wOFF' (0x77, 0x4F, 0x46, 0x46)
    const woffBytes = new Uint8Array([0x77, 0x4F, 0x46, 0x46, 0x00, 0x10]);
    expect(detectFontFormat(woffBytes)).toBe('woff');
  });

  it('extracts embedded TrueType and OpenType fonts from PDF context', async () => {
    const doc = await PDFDocument.create();

    // 1. Register a fake TTF stream in FontFile2
    const fakeTtfBytes = new Uint8Array([0x00, 0x01, 0x00, 0x00, 0x00, 0x0C, 0x00, 0x80]);
    const ttfStreamRef = doc.context.register(doc.context.flateStream(fakeTtfBytes));

    const fontDesc1 = doc.context.obj({
      Type: 'FontDescriptor',
      FontName: 'ABCDEF+BrandSans-Bold',
      FontFile2: ttfStreamRef
    });
    const fontDesc1Ref = doc.context.register(fontDesc1);

    const fontDict1 = doc.context.obj({
      Type: 'Font',
      Subtype: 'TrueType',
      BaseFont: 'ABCDEF+BrandSans-Bold',
      FontDescriptor: fontDesc1Ref
    });
    doc.context.register(fontDict1);

    // 2. Register a fake OTF stream in FontFile3
    const fakeOtfBytes = new Uint8Array([0x4F, 0x54, 0x54, 0x4F, 0x00, 0x08, 0x00, 0x80]);
    const otfStreamRef = doc.context.register(doc.context.flateStream(fakeOtfBytes));

    const fontDesc2 = doc.context.obj({
      Type: 'FontDescriptor',
      FontName: 'GHIJKL+EditorialSerif',
      FontFile3: otfStreamRef
    });
    const fontDesc2Ref = doc.context.register(fontDesc2);

    const fontDict2 = doc.context.obj({
      Type: 'Font',
      Subtype: 'Type0',
      BaseFont: 'GHIJKL+EditorialSerif',
      FontDescriptor: fontDesc2Ref
    });
    doc.context.register(fontDict2);

    const pdfBytes = await doc.save();

    const result = await extractEmbeddedFonts(pdfBytes);
    expect(result.fonts.length).toBe(2);

    const ttfFont = result.fonts.find(f => f.cleanFamilyName === 'BrandSans-Bold');
    expect(ttfFont).toBeDefined();
    expect(ttfFont?.format).toBe('ttf');
    expect(ttfFont?.isSubset).toBe(true);
    expect(ttfFont?.data.length).toBe(fakeTtfBytes.length);

    const otfFont = result.fonts.find(f => f.cleanFamilyName === 'EditorialSerif');
    expect(otfFont).toBeDefined();
    expect(otfFont?.format).toBe('otf');
    expect(otfFont?.isSubset).toBe(true);

    // Test ZIP packaging
    const zipBytes = await createFontsZip(result.fonts, 'sample.pdf');
    expect(zipBytes).toBeInstanceOf(Uint8Array);
    expect(zipBytes.length).toBeGreaterThan(100);
  });

  it('handles PDFs with no embedded fonts gracefully', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([300, 300]);
    const pdfBytes = await doc.save();

    const result = await extractEmbeddedFonts(pdfBytes);
    expect(result.fonts).toEqual([]);
    expect(result.totalEmbeddedCount).toBe(0);
  });
});
