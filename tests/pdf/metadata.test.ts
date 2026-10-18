import { describe, it, expect } from 'vitest';
import { PDFDocument, PDFName } from 'pdf-lib';
import { readPdfMetadata, updatePdfMetadata } from '../../src/lib/pdf/metadata';

describe('PDF Metadata & Deep Sanitizer Engine', () => {
  it('reads metadata fields and XMP presence from a document', async () => {
    const doc = await PDFDocument.create({ updateMetadata: false });
    doc.addPage([600, 400]);
    doc.setTitle('Confidential Briefing');
    doc.setAuthor('Agent 007');
    doc.setSubject('Top Secret Mission');
    doc.setKeywords(['security', 'intel', 'covert']);
    doc.setProducer('Internal Document Generator');

    const inputBytes = await doc.save({ updateInfoDict: false });

    const meta = await readPdfMetadata(inputBytes);
    expect(meta.title).toBe('Confidential Briefing');
    expect(meta.author).toBe('Agent 007');
    expect(meta.subject).toBe('Top Secret Mission');
    expect(meta.keywords).toContain('security');
    expect(meta.keywords).toContain('intel');
    expect(meta.producer).toBe('Internal Document Generator');
  });

  it('updates specific metadata properties while preserving document pages', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([600, 400]);
    doc.setTitle('Draft 1');
    doc.setAuthor('Old Author');
    const inputBytes = await doc.save();

    const result = await updatePdfMetadata(inputBytes, {
      title: 'Final Version',
      author: 'New Author',
      subject: 'Quarterly Report',
      keywords: ['finance', '2026'],
    });

    expect(result.pageCount).toBe(1);
    expect(result.updatedFieldsCount).toBeGreaterThanOrEqual(2);

    const reloaded = await readPdfMetadata(result.outputBytes);
    expect(reloaded.title).toBe('Final Version');
    expect(reloaded.author).toBe('New Author');
    expect(reloaded.subject).toBe('Quarterly Report');
    expect(reloaded.keywords).toEqual(['finance', '2026']);
  });

  it('deeply sanitizes and scrubs all metadata and XMP packets', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([500, 700]);
    doc.setTitle('Leaked Internal Document');
    doc.setAuthor('John Doe - HR Dept');
    doc.setSubject('Confidential Memo');
    doc.setKeywords(['lawsuit', 'internal']);

    // Inject simulated XMP Metadata stream in catalog
    const xmpStream = doc.context.stream('<x:xmpmeta>sensitive tracking uuid</x:xmpmeta>');
    const xmpRef = doc.context.register(xmpStream);
    doc.catalog.set(PDFName.of('Metadata'), xmpRef);

    const inputBytes = await doc.save();

    // Verify XMP is initially detected
    const beforeMeta = await readPdfMetadata(inputBytes);
    expect(beforeMeta.hasXmpMetadata).toBe(true);
    expect(beforeMeta.author).toBe('John Doe - HR Dept');

    // Run Deep Sanitizer
    const result = await updatePdfMetadata(inputBytes, {
      deepSanitize: true,
    });

    expect(result.xmpPurged).toBe(true);
    expect(result.removedFieldsCount).toBeGreaterThan(0);

    const afterDoc = await PDFDocument.load(result.outputBytes);
    expect(afterDoc.getPageCount()).toBe(1);
    expect(afterDoc.catalog.has(PDFName.of('Metadata'))).toBe(false);

    const afterMeta = await readPdfMetadata(result.outputBytes);
    expect(afterMeta.author).toBeUndefined();
    expect(afterMeta.title).toBeUndefined();
    expect(afterMeta.hasXmpMetadata).toBe(false);
  });
});
