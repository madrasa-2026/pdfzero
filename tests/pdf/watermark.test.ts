import { describe, it, expect } from 'vitest';
import { PDFDocument, PDFName, PDFDict, PDFString, StandardFonts, rgb } from 'pdf-lib';
import {
  detectWatermarks,
  removeWatermarks,
  stripWatermarkAnnotations,
  stripWatermarkXObjects,
  type WatermarkRemovalOptions,
} from '../../src/lib/pdf/watermark';

describe('PDF Watermark & Stamp Remover Engine', () => {
  it('detects and removes watermark and stamp annotations from pages', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([300, 300]);
    page.drawText('Legitimate Content', { x: 50, y: 250, size: 14 });

    // Manually inject a Watermark annotation into page.node
    const watermarkAnnot = doc.context.obj({
      Type: 'Annot',
      Subtype: 'Watermark',
      Rect: [20, 20, 280, 280],
      Contents: PDFString.of('DRAFT WATERMARK'),
    });
    const watermarkRef = doc.context.register(watermarkAnnot);

    const stampAnnot = doc.context.obj({
      Type: 'Annot',
      Subtype: 'Stamp',
      Rect: [50, 50, 150, 100],
      Contents: PDFString.of('CONFIDENTIAL'),
    });
    const stampRef = doc.context.register(stampAnnot);

    page.node.set(PDFName.of('Annots'), doc.context.obj([watermarkRef, stampRef]));

    const pdfBytes = await doc.save({ useObjectStreams: false });

    // 1. Detection
    const detection = await detectWatermarks(pdfBytes);
    expect(detection.watermarkAnnotationsCount).toBe(2);
    expect(detection.pagesScanned).toBe(1);

    // 2. Removal
    const removalResult = await removeWatermarks(pdfBytes, {
      removeAnnotations: true,
      removeXObjects: false,
      removeTransparentLayers: false,
    });

    expect(removalResult.annotationsRemoved).toBe(2);

    // 3. Verify on loaded document
    const cleanedDoc = await PDFDocument.load(removalResult.cleanedBytes);
    const cleanedPage = cleanedDoc.getPage(0);
    const annots = cleanedPage.node.Annots();
    expect(!annots || annots.size() === 0).toBe(true);
  });

  it('detects and removes watermark Form XObjects from page resources', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([300, 300]);
    page.drawText('Original Contract Agreement', { x: 50, y: 250, size: 12 });

    // Create an XObject named WatermarkLayer
    const xObject = doc.context.flateStream('', {
      Type: 'XObject',
      Subtype: 'Form',
      BBox: [0, 0, 300, 300],
    });
    const xObjectRef = doc.context.register(xObject);

    // Attach to page resources
    let resources = page.node.Resources();
    if (!resources) {
      page.node.set(PDFName.of('Resources'), doc.context.obj({}));
      resources = page.node.Resources()!;
    }
    const xObjectDict = doc.context.obj({
      Watermark1: xObjectRef,
      NormalImage: xObjectRef,
    });
    resources.set(PDFName.of('XObject'), xObjectDict);

    const pdfBytes = await doc.save({ useObjectStreams: false });

    // Detect
    const detection = await detectWatermarks(pdfBytes);
    expect(detection.watermarkXObjectsCount).toBeGreaterThanOrEqual(1);

    // Remove
    const result = await removeWatermarks(pdfBytes, {
      removeAnnotations: false,
      removeXObjects: true,
      removeTransparentLayers: false,
    });

    expect(result.xObjectsRemoved).toBeGreaterThanOrEqual(1);

    // Verify cleaned doc
    const cleanedDoc = await PDFDocument.load(result.cleanedBytes);
    const cleanedPage = cleanedDoc.getPage(0);
    const res = cleanedPage.node.Resources();
    const xobjs = res?.lookup(PDFName.of('XObject')) as PDFDict | undefined;
    expect(xobjs?.has(PDFName.of('Watermark1'))).toBe(false);
    expect(xobjs?.has(PDFName.of('NormalImage'))).toBe(true);
  });

  it('filters specific watermark text strings from content stream while preserving body text', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const page = doc.addPage([400, 400]);

    page.drawText('Official Statement Document', { x: 50, y: 300, size: 14, font });
    page.drawText('TOP SECRET SAMPLE', { x: 50, y: 200, size: 24, font, color: rgb(0.8, 0.8, 0.8) });

    const pdfBytes = await doc.save({ useObjectStreams: false });

    const result = await removeWatermarks(pdfBytes, {
      removeAnnotations: false,
      removeXObjects: false,
      removeTransparentLayers: false,
      textKeywordsToRemove: ['SAMPLE', 'TOP SECRET'],
    });

    expect(result.textOccurrencesRemoved).toBeGreaterThanOrEqual(1);

    const cleanedDoc = await PDFDocument.load(result.cleanedBytes);
    expect(cleanedDoc.getPageCount()).toBe(1);
  });
});
