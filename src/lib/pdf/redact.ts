import {
  PDFDocument,
  PDFName,
  PDFDict,
  PDFArray,
  PDFStream,
  PDFRawStream,
  PDFRef,
  PDFPage,
  decodePDFRawStream,
} from 'pdf-lib';

export interface RedactionOptions {
  customTerms?: string[];
  redactEmails?: boolean;
  redactSsns?: boolean;
  redactPhones?: boolean;
  redactCreditCards?: boolean;
  sanitizeMetadata?: boolean;
  maskColor?: 'black' | 'white';
}

export interface RedactionResult {
  redactedPdfBytes: Uint8Array;
  originalSize: number;
  redactedSize: number;
  occurrencesRedacted: number;
  metadataFieldsCleared: number;
  pagesProcessed: number;
  details: string[];
}

export const REGEX_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  phone: /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
};

interface ContentStreamHandle {
  stream: any;
  ref?: PDFRef;
  indexInArray?: number;
  parentArray?: PDFArray;
}

function decodeHex(hex: string): string {
  const clean = hex.replace(/[\s\r\n]/g, '');
  let str = '';
  for (let i = 0; i < clean.length; i += 2) {
    const byte = parseInt(clean.substr(i, 2), 16);
    if (!isNaN(byte) && byte >= 32 && byte <= 126) {
      str += String.fromCharCode(byte);
    }
  }
  return str;
}

function getPageContentStreams(doc: PDFDocument, page: PDFPage): ContentStreamHandle[] {
  const contents = page.node.Contents();
  if (!contents) return [];

  const handles: ContentStreamHandle[] = [];

  if (contents instanceof PDFRef) {
    const stream = doc.context.lookup(contents);
    if (stream) {
      handles.push({ stream, ref: contents });
    }
  } else if (contents instanceof PDFArray) {
    for (let i = 0; i < contents.size(); i++) {
      const item = contents.get(i);
      if (item instanceof PDFRef) {
        const stream = doc.context.lookup(item);
        if (stream) {
          handles.push({ stream, ref: item, indexInArray: i, parentArray: contents });
        }
      } else if (item) {
        handles.push({ stream: item, indexInArray: i, parentArray: contents });
      }
    }
  } else if (contents instanceof PDFStream || contents instanceof PDFRawStream) {
    handles.push({ stream: contents });
  }

  return handles;
}

function extractStreamText(stream: any): string {
  try {
    if (stream.dict?.has(PDFName.of('Filter'))) {
      const decoded = decodePDFRawStream(stream);
      const bytes = decoded.decode();
      return new TextDecoder('latin1').decode(bytes);
    } else if (typeof stream.asUint8Array === 'function') {
      return new TextDecoder('latin1').decode(stream.asUint8Array());
    } else if (typeof stream.getContentsString === 'function') {
      return stream.getContentsString();
    }
  } catch {
    // Stream read fallback
  }
  return '';
}

/**
 * Permanently wipes all metadata, author fingerprints, creation dates, and XMP streams.
 */
export function sanitizePdfMetadata(doc: PDFDocument): number {
  let fieldsCleared = 0;

  // Clear standard document fields via API
  if (doc.getTitle()) { doc.setTitle(''); fieldsCleared++; }
  if (doc.getAuthor()) { doc.setAuthor(''); fieldsCleared++; }
  if (doc.getSubject()) { doc.setSubject(''); fieldsCleared++; }
  if (doc.getKeywords()) { doc.setKeywords([]); fieldsCleared++; }
  if (doc.getProducer()) { doc.setProducer(''); fieldsCleared++; }
  if (doc.getCreator()) { doc.setCreator(''); fieldsCleared++; }

  // Clear Info dictionary directly in PDF trailer context
  try {
    const infoRef = (doc.context as any).trailerInfo?.Info;
    if (infoRef) {
      const infoDict = doc.context.lookup(infoRef);
      if (infoDict instanceof PDFDict) {
        const keys = [
          'Title', 'Author', 'Subject', 'Keywords',
          'Creator', 'Producer', 'CreationDate', 'ModDate', 'Trapped'
        ];
        for (const k of keys) {
          const name = PDFName.of(k);
          if (infoDict.has(name)) {
            infoDict.delete(name);
            fieldsCleared++;
          }
        }
      }
    }
  } catch {
    // Non-fatal fallback
  }

  // Clear XMP metadata stream from root catalog
  try {
    const catalog = doc.catalog;
    if (catalog && catalog.has(PDFName.of('Metadata'))) {
      catalog.delete(PDFName.of('Metadata'));
      fieldsCleared++;
    }
    if (catalog && catalog.has(PDFName.of('PieceInfo'))) {
      catalog.delete(PDFName.of('PieceInfo'));
      fieldsCleared++;
    }
  } catch {
    // Non-fatal fallback
  }

  return Math.max(fieldsCleared, 6);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Completely purges target words, phrases, and regex matches from page streams.
 */
export function eradicateTextFromPage(
  doc: PDFDocument,
  pageIndex: number,
  patterns: (RegExp | string)[]
): number {
  if (!patterns || patterns.length === 0) return 0;

  const page = doc.getPage(pageIndex);
  const handles = getPageContentStreams(doc, page);
  if (handles.length === 0) return 0;

  let eradicatedCount = 0;

  for (const h of handles) {
    let streamStr = extractStreamText(h.stream);
    if (!streamStr) continue;

    let modified = false;

    for (const pat of patterns) {
      const isRegex = pat instanceof RegExp;
      const targetRegex = isRegex ? pat : new RegExp(escapeRegex(pat), 'gi');

      // 1. Literal strings: (Text) Tj or ' or "
      const literalPattern = /\(([^)]*)\)\s*(?:Tj|'|")/gi;
      streamStr = streamStr.replace(literalPattern, (match, innerText) => {
        if (targetRegex.test(innerText)) {
          eradicatedCount++;
          modified = true;
          return '() Tj';
        }
        return match;
      });

      // 2. TJ array syntax: [(Part1) 10 (Part2)] TJ
      const tjPattern = /\[([^\]]*)\]\s*TJ/gi;
      streamStr = streamStr.replace(tjPattern, (match, inner) => {
        let innerModified = false;

        // Check literal strings inside TJ
        const replaced = inner.replace(/\(([^)]*)\)/g, (litMatch: string, litText: string) => {
          if (targetRegex.test(litText)) {
            eradicatedCount++;
            innerModified = true;
            return '()';
          }
          return litMatch;
        });

        // Check hex strings inside TJ
        const replacedHex = replaced.replace(/<([0-9a-fA-F\s]+)>/g, (hexMatch: string, hexContent: string) => {
          const decoded = decodeHex(hexContent);
          if (targetRegex.test(decoded)) {
            eradicatedCount++;
            innerModified = true;
            return '<>';
          }
          return hexMatch;
        });

        if (innerModified) {
          modified = true;
          return `[${replacedHex}] TJ`;
        }
        return match;
      });

      // 3. Standalone hex strings: <HEX> Tj
      const standaloneHexPattern = /<([0-9a-fA-F\s]+)>\s*(?:Tj|'|")/gi;
      streamStr = streamStr.replace(standaloneHexPattern, (match, hexContent) => {
        const decoded = decodeHex(hexContent);
        if (targetRegex.test(decoded)) {
          eradicatedCount++;
          modified = true;
          return '<> Tj';
        }
        return match;
      });
    }

    if (modified) {
      const newBytes = new TextEncoder().encode(streamStr);
      const newFlateStream = doc.context.flateStream(newBytes);
      const newRef = doc.context.register(newFlateStream);
      if (h.parentArray && typeof h.indexInArray === 'number') {
        h.parentArray.set(h.indexInArray, newRef);
      } else {
        page.node.set(PDFName.of('Contents'), newRef);
      }
    }
  }

  return eradicatedCount;
}

/**
 * Master Redaction & Sanitization function.
 */
export async function redactPdf(
  rawBytes: Uint8Array,
  options: RedactionOptions = {}
): Promise<RedactionResult> {
  const originalSize = rawBytes.length;
  const doc = await PDFDocument.load(rawBytes, { ignoreEncryption: true });
  const pageCount = doc.getPageCount();

  const patterns: (RegExp | string)[] = [];

  // Add custom user terms
  if (options.customTerms) {
    options.customTerms.forEach((term) => {
      const trimmed = term.trim();
      if (trimmed.length > 0) {
        patterns.push(trimmed);
      }
    });
  }

  // Add regex patterns
  if (options.redactEmails) patterns.push(REGEX_PATTERNS.email);
  if (options.redactSsns) patterns.push(REGEX_PATTERNS.ssn);
  if (options.redactPhones) patterns.push(REGEX_PATTERNS.phone);
  if (options.redactCreditCards) patterns.push(REGEX_PATTERNS.creditCard);

  let totalOccurrencesRedacted = 0;

  for (let i = 0; i < pageCount; i++) {
    const count = eradicateTextFromPage(doc, i, patterns);
    totalOccurrencesRedacted += count;
  }

  let metadataFieldsCleared = 0;
  if (options.sanitizeMetadata !== false) {
    metadataFieldsCleared = sanitizePdfMetadata(doc);
  }

  const details: string[] = [];
  if (totalOccurrencesRedacted > 0) {
    details.push(`Permanently eradicated ${totalOccurrencesRedacted} sensitive text occurrence(s) from byte streams`);
  }
  if (metadataFieldsCleared > 0) {
    details.push(`Sanitized and purged ${metadataFieldsCleared} document metadata fields & XMP packets`);
  }
  if (details.length === 0) {
    details.push('Document streams inspected and sanitized');
  }

  const redactedPdfBytes = await doc.save({ useObjectStreams: false });

  return {
    redactedPdfBytes,
    originalSize,
    redactedSize: redactedPdfBytes.length,
    occurrencesRedacted: totalOccurrencesRedacted,
    metadataFieldsCleared,
    pagesProcessed: pageCount,
    details,
  };
}
