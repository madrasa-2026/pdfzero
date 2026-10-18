import { PDFDocument, PDFName, PDFDict } from 'pdf-lib';

export interface PdfMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  producer?: string;
  creator?: string;
  creationDate?: Date;
  modificationDate?: Date;
  hasXmpMetadata: boolean;
}

export interface UpdateMetadataOptions {
  deepSanitize?: boolean; // Wipe all identifying metadata, timestamps, and XMP streams
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  producer?: string;
  creator?: string;
  updateModificationDate?: boolean;
  wipeDates?: boolean;
}

export interface MetadataResult {
  outputBytes: Uint8Array;
  pageCount: number;
  originalSize: number;
  outputSize: number;
  removedFieldsCount: number;
  updatedFieldsCount: number;
  xmpPurged: boolean;
}

/**
 * Extracts standard metadata and checks for XMP packets in a PDF
 */
export async function readPdfMetadata(inputBytes: Uint8Array): Promise<PdfMetadata> {
  const doc = await PDFDocument.load(inputBytes, { ignoreEncryption: true, updateMetadata: false });

  const title = doc.getTitle();
  const author = doc.getAuthor();
  const subject = doc.getSubject();
  const keywordsStr = doc.getKeywords();
  let keywords: string[] | undefined;

  if (keywordsStr) {
    keywords = keywordsStr
      .split(/[,;\s]+/)
      .map((k) => k.trim())
      .filter(Boolean);
  }

  const producer = doc.getProducer();
  const creator = doc.getCreator();
  const creationDate = doc.getCreationDate();
  const modificationDate = doc.getModificationDate();

  const hasXmp = !!doc.catalog.get(PDFName.of('Metadata'));

  return {
    title: title || undefined,
    author: author || undefined,
    subject: subject || undefined,
    keywords: keywords && keywords.length > 0 ? keywords : undefined,
    producer: producer || undefined,
    creator: creator || undefined,
    creationDate: creationDate || undefined,
    modificationDate: modificationDate || undefined,
    hasXmpMetadata: hasXmp,
  };
}

/**
 * Updates, clears, or deeply sanitizes PDF metadata and XMP packets
 */
export async function updatePdfMetadata(
  inputBytes: Uint8Array,
  options: UpdateMetadataOptions = {}
): Promise<MetadataResult> {
  const originalSize = inputBytes.length;
  const doc = await PDFDocument.load(inputBytes, { ignoreEncryption: true, updateMetadata: false });
  const pageCount = doc.getPageCount();

  let removedFieldsCount = 0;
  let updatedFieldsCount = 0;
  let xmpPurged = false;

  const infoRef = doc.context.trailerInfo.Info;
  let infoDict: PDFDict | undefined;
  if (infoRef) {
    const lookup = doc.context.lookup(infoRef);
    if (lookup instanceof PDFDict) {
      infoDict = lookup;
    }
  }

  if (options.deepSanitize) {
    // Deep Sanitize Mode: Purge all identifying information completely
    if (infoDict) {
      const keysToDelete = [
        'Title',
        'Author',
        'Subject',
        'Keywords',
        'Producer',
        'Creator',
        'CreationDate',
        'ModDate',
        'Trapped',
        'Company',
        'SourceModified',
      ];
      for (const k of keysToDelete) {
        const pdfName = PDFName.of(k);
        if (infoDict.has(pdfName)) {
          infoDict.delete(pdfName);
          removedFieldsCount++;
        }
      }
    }

    // Delete XMP Metadata stream from Catalog
    if (doc.catalog.has(PDFName.of('Metadata'))) {
      doc.catalog.delete(PDFName.of('Metadata'));
      xmpPurged = true;
      removedFieldsCount++;
    }

    // Delete private PieceInfo if present
    if (doc.catalog.has(PDFName.of('PieceInfo'))) {
      doc.catalog.delete(PDFName.of('PieceInfo'));
      removedFieldsCount++;
    }

    // Ensure doc properties in pdf-lib helper are scrubbed
    doc.setTitle('');
    doc.setAuthor('');
    doc.setSubject('');
    doc.setKeywords([]);
    doc.setProducer('AirPDF (Privacy Sanitized)');
    doc.setCreator('AirPDF');

    // Again delete producer/creator to leave no traces if desired
    if (infoDict) {
      infoDict.delete(PDFName.of('Title'));
      infoDict.delete(PDFName.of('Author'));
      infoDict.delete(PDFName.of('Subject'));
      infoDict.delete(PDFName.of('Keywords'));
      infoDict.delete(PDFName.of('CreationDate'));
      infoDict.delete(PDFName.of('ModDate'));
    }
  } else {
    // Targeted Update Mode
    if (options.title !== undefined) {
      if (options.title.trim() === '') {
        if (infoDict) infoDict.delete(PDFName.of('Title'));
        removedFieldsCount++;
      } else {
        doc.setTitle(options.title);
        updatedFieldsCount++;
      }
    }

    if (options.author !== undefined) {
      if (options.author.trim() === '') {
        if (infoDict) infoDict.delete(PDFName.of('Author'));
        removedFieldsCount++;
      } else {
        doc.setAuthor(options.author);
        updatedFieldsCount++;
      }
    }

    if (options.subject !== undefined) {
      if (options.subject.trim() === '') {
        if (infoDict) infoDict.delete(PDFName.of('Subject'));
        removedFieldsCount++;
      } else {
        doc.setSubject(options.subject);
        updatedFieldsCount++;
      }
    }

    if (options.keywords !== undefined) {
      if (options.keywords.length === 0) {
        if (infoDict) infoDict.delete(PDFName.of('Keywords'));
        removedFieldsCount++;
      } else {
        doc.setKeywords(options.keywords);
        updatedFieldsCount++;
      }
    }

    if (options.producer !== undefined) {
      if (options.producer.trim() === '') {
        if (infoDict) infoDict.delete(PDFName.of('Producer'));
        removedFieldsCount++;
      } else {
        doc.setProducer(options.producer);
        updatedFieldsCount++;
      }
    }

    if (options.creator !== undefined) {
      if (options.creator.trim() === '') {
        if (infoDict) infoDict.delete(PDFName.of('Creator'));
        removedFieldsCount++;
      } else {
        doc.setCreator(options.creator);
        updatedFieldsCount++;
      }
    }

    if (options.wipeDates) {
      if (infoDict) {
        infoDict.delete(PDFName.of('CreationDate'));
        infoDict.delete(PDFName.of('ModDate'));
        removedFieldsCount += 2;
      }
    } else if (options.updateModificationDate) {
      doc.setModificationDate(new Date());
      updatedFieldsCount++;
    }
  }

  const outputBytes = await doc.save({ useObjectStreams: false, updateInfoDict: false });

  return {
    outputBytes,
    pageCount,
    originalSize,
    outputSize: outputBytes.length,
    removedFieldsCount,
    updatedFieldsCount,
    xmpPurged,
  };
}
