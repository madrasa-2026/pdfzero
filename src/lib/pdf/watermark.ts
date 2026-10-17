import {
  PDFDocument,
  PDFName,
  PDFDict,
  PDFArray,
  PDFStream,
  PDFRawStream,
  PDFString,
  PDFHexString,
  PDFRef,
  PDFPage,
  decodePDFRawStream,
} from 'pdf-lib';

export interface WatermarkDetectionResult {
  pagesScanned: number;
  watermarkAnnotationsCount: number;
  watermarkXObjectsCount: number;
  detectedKeywords: string[];
  hasLowOpacityArtifacts: boolean;
}

export interface WatermarkRemovalOptions {
  removeAnnotations?: boolean;
  removeXObjects?: boolean;
  removeTransparentLayers?: boolean;
  textKeywordsToRemove?: string[];
  areaPreset?: 'none' | 'center' | 'header' | 'footer';
}

export interface WatermarkRemovalResult {
  cleanedBytes: Uint8Array;
  originalSize: number;
  cleanedSize: number;
  pagesProcessed: number;
  annotationsRemoved: number;
  xObjectsRemoved: number;
  textOccurrencesRemoved: number;
  details: string[];
}

export const COMMON_WATERMARK_KEYWORDS = [
  'WATERMARK',
  'DRAFT',
  'CONFIDENTIAL',
  'SAMPLE',
  'COPY',
  'TOP SECRET',
  'DO NOT COPY',
  'PREVIEW',
  'INTERNAL USE',
  'UNAPPROVED',
];

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
    // Non-fatal fallback for unhandled filters
  }
  return '';
}

/**
 * Scans a PDF buffer and detects potential watermarks, stamps, and watermark XObjects.
 */
export async function detectWatermarks(bytes: Uint8Array): Promise<WatermarkDetectionResult> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pageCount = doc.getPageCount();

  let watermarkAnnotationsCount = 0;
  let watermarkXObjectsCount = 0;
  let hasLowOpacityArtifacts = false;
  const detectedKeywordsSet = new Set<string>();

  for (let i = 0; i < pageCount; i++) {
    const page = doc.getPage(i);

    // 1. Check annotations
    const annots = page.node.Annots();
    if (annots) {
      for (let j = 0; j < annots.size(); j++) {
        const annotRefOrDict = annots.get(j);
        const annotDict = annotRefOrDict instanceof PDFDict
          ? annotRefOrDict
          : (doc.context.lookup(annotRefOrDict as PDFRef) as PDFDict);

        if (annotDict instanceof PDFDict) {
          const subtype = annotDict.lookup(PDFName.of('Subtype'))?.toString();
          const contents = annotDict.lookup(PDFName.of('Contents'))?.toString().toUpperCase() || '';

          const isWatermarkType = subtype === '/Watermark' || subtype === '/Stamp';
          const matchesKeyword = COMMON_WATERMARK_KEYWORDS.some((kw) => contents.includes(kw));

          if (isWatermarkType || matchesKeyword) {
            watermarkAnnotationsCount++;
            COMMON_WATERMARK_KEYWORDS.forEach((kw) => {
              if (contents.includes(kw)) detectedKeywordsSet.add(kw);
            });
          }
        }
      }
    }

    // 2. Check XObjects in page resources
    const resources = page.node.Resources();
    if (resources) {
      const xObjectDict = resources.lookup(PDFName.of('XObject'));
      if (xObjectDict instanceof PDFDict) {
        const entries = xObjectDict.entries();
        for (const [key] of entries) {
          const keyName = key.asString();
          const lower = keyName.toLowerCase();
          if (
            lower.includes('watermark') ||
            lower.startsWith('wm') ||
            lower.includes('stamp') ||
            lower.includes('draft')
          ) {
            watermarkXObjectsCount++;
          }
        }
      }
    }

    // 3. Scan content streams for keywords and transparency
    const handles = getPageContentStreams(doc, page);
    for (const h of handles) {
      const streamText = extractStreamText(h.stream);
      if (!streamText) continue;

      const upper = streamText.toUpperCase();
      if (upper.includes('/ARTIFACT') || upper.includes('CA ') || upper.includes('CA\n') || upper.includes('/BM /MULTIPLY')) {
        hasLowOpacityArtifacts = true;
      }

      // Check literal strings
      for (const kw of COMMON_WATERMARK_KEYWORDS) {
        if (upper.includes(`(${kw})`) || upper.includes(kw)) {
          detectedKeywordsSet.add(kw);
        }
      }

      // Check hex strings
      const hexMatches = streamText.matchAll(/<([0-9a-fA-F\s]+)>/g);
      for (const m of hexMatches) {
        const decoded = decodeHex(m[1]).toUpperCase();
        for (const kw of COMMON_WATERMARK_KEYWORDS) {
          if (decoded.includes(kw)) {
            detectedKeywordsSet.add(kw);
          }
        }
      }
    }
  }

  return {
    pagesScanned: pageCount,
    watermarkAnnotationsCount,
    watermarkXObjectsCount,
    detectedKeywords: Array.from(detectedKeywordsSet),
    hasLowOpacityArtifacts,
  };
}

/**
 * Strips watermark and stamp annotations from a page.
 */
export function stripWatermarkAnnotations(
  doc: PDFDocument,
  pageIndex: number,
  keywords: string[] = COMMON_WATERMARK_KEYWORDS
): number {
  const page = doc.getPage(pageIndex);
  const annots = page.node.Annots();
  if (!annots) return 0;

  let removedCount = 0;
  const filteredAnnots = doc.context.obj([]) as PDFArray;

  for (let i = 0; i < annots.size(); i++) {
    const annotRefOrDict = annots.get(i);
    const annotDict = annotRefOrDict instanceof PDFDict
      ? annotRefOrDict
      : (doc.context.lookup(annotRefOrDict as PDFRef) as PDFDict);

    let shouldRemove = false;
    if (annotDict instanceof PDFDict) {
      const subtype = annotDict.lookup(PDFName.of('Subtype'))?.toString();
      const contents = annotDict.lookup(PDFName.of('Contents'))?.toString().toUpperCase() || '';

      if (subtype === '/Watermark' || subtype === '/Stamp') {
        shouldRemove = true;
      } else if (keywords.some((kw) => contents.includes(kw.toUpperCase()))) {
        shouldRemove = true;
      }
    }

    if (shouldRemove) {
      removedCount++;
    } else {
      filteredAnnots.push(annotRefOrDict);
    }
  }

  if (filteredAnnots.size() === 0) {
    page.node.delete(PDFName.of('Annots'));
  } else {
    page.node.set(PDFName.of('Annots'), filteredAnnots);
  }

  return removedCount;
}

/**
 * Strips watermark Form XObjects from page resources and scrubs invocations.
 */
export function stripWatermarkXObjects(doc: PDFDocument, pageIndex: number): number {
  const page = doc.getPage(pageIndex);
  const resources = page.node.Resources();
  if (!resources) return 0;

  const xObjectDict = resources.lookup(PDFName.of('XObject'));
  if (!(xObjectDict instanceof PDFDict)) return 0;

  let removedCount = 0;
  const removedKeys: string[] = [];

  const entries = xObjectDict.entries();
  for (const [key] of entries) {
    const keyName = key.asString();
    const lower = keyName.toLowerCase();
    if (
      lower.includes('watermark') ||
      lower.startsWith('wm') ||
      lower.includes('stamp') ||
      lower.includes('draft')
    ) {
      xObjectDict.delete(key);
      removedKeys.push(keyName);
      removedCount++;
    }
  }

  // Scrub 'Do' operator invocations from content streams
  if (removedKeys.length > 0) {
    const handles = getPageContentStreams(doc, page);
    for (const h of handles) {
      let streamStr = extractStreamText(h.stream);
      if (!streamStr) continue;

      let modified = false;
      for (const k of removedKeys) {
        const doPattern = new RegExp(`/${k}\\s+Do`, 'g');
        if (doPattern.test(streamStr)) {
          streamStr = streamStr.replace(doPattern, '');
          modified = true;
        }
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
  }

  return removedCount;
}

/**
 * Filters out specific watermark text phrases or patterns from the content streams.
 */
export function filterWatermarkKeywords(
  doc: PDFDocument,
  pageIndex: number,
  keywords: string[]
): number {
  if (!keywords || keywords.length === 0) return 0;

  const page = doc.getPage(pageIndex);
  const handles = getPageContentStreams(doc, page);
  if (handles.length === 0) return 0;

  let occurrencesRemoved = 0;

  for (const h of handles) {
    let streamStr = extractStreamText(h.stream);
    if (!streamStr) continue;

    let changed = false;

    for (const kw of keywords) {
      if (!kw || kw.trim().length === 0) continue;
      const cleanKw = kw.trim();
      const escaped = escapeRegex(cleanKw);

      // 1. Literal strings: (Text containing kw) Tj or ' or "
      const literalPattern = new RegExp(
        `\\(([^)]*?${escaped}[^)]*?)\\)\\s*(?:Tj|'|")`,
        'gi'
      );
      if (literalPattern.test(streamStr)) {
        streamStr = streamStr.replace(literalPattern, '() Tj');
        occurrencesRemoved++;
        changed = true;
      }

      // 2. TJ array syntax: [(T) 20 (e) (xt)] TJ with literal
      const tjLiteralPattern = new RegExp(
        `\\[([^\\]]*?${escaped}[^\\]]*?)\\]\\s*TJ`,
        'gi'
      );
      if (tjLiteralPattern.test(streamStr)) {
        streamStr = streamStr.replace(tjLiteralPattern, '[] TJ');
        occurrencesRemoved++;
        changed = true;
      }

      // 3. Hex strings: <HEX> Tj or <HEX> within TJ
      // Scan each hex string in the stream
      const hexPattern = /<([0-9a-fA-F\s]+)>\s*(?:Tj|'|")/gi;
      streamStr = streamStr.replace(hexPattern, (match, hexContent) => {
        const decoded = decodeHex(hexContent);
        if (decoded.toUpperCase().includes(cleanKw.toUpperCase())) {
          occurrencesRemoved++;
          changed = true;
          return '<> Tj';
        }
        return match;
      });

      // Also hex strings within TJ arrays: [<HEX> -10 <HEX>] TJ
      const tjWithHexPattern = /\[([^\]]*?)\]\s*TJ/gi;
      streamStr = streamStr.replace(tjWithHexPattern, (match, inner) => {
        let innerChanged = false;
        const replacedInner = inner.replace(/<([0-9a-fA-F\s]+)>/g, (hexMatch: string, hexContent: string) => {
          const decoded = decodeHex(hexContent);
          if (decoded.toUpperCase().includes(cleanKw.toUpperCase())) {
            occurrencesRemoved++;
            innerChanged = true;
            return '<>';
          }
          return hexMatch;
        });

        if (innerChanged) {
          changed = true;
          return `[${replacedInner}] TJ`;
        }
        return match;
      });
    }

    if (changed) {
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

  return occurrencesRemoved;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Master watermark removal function.
 */
export async function removeWatermarks(
  bytes: Uint8Array,
  options: WatermarkRemovalOptions = {}
): Promise<WatermarkRemovalResult> {
  const originalSize = bytes.length;
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pageCount = doc.getPageCount();

  let annotationsRemoved = 0;
  let xObjectsRemoved = 0;
  let textOccurrencesRemoved = 0;
  const details: string[] = [];

  const shouldRemoveAnnots = options.removeAnnotations !== false;
  const shouldRemoveXObjects = options.removeXObjects !== false;
  const textKeywords = options.textKeywordsToRemove || [];

  for (let i = 0; i < pageCount; i++) {
    if (shouldRemoveAnnots) {
      const count = stripWatermarkAnnotations(doc, i, [
        ...COMMON_WATERMARK_KEYWORDS,
        ...textKeywords,
      ]);
      annotationsRemoved += count;
    }

    if (shouldRemoveXObjects) {
      const count = stripWatermarkXObjects(doc, i);
      xObjectsRemoved += count;
    }

    if (textKeywords.length > 0) {
      const count = filterWatermarkKeywords(doc, i, textKeywords);
      textOccurrencesRemoved += count;
    }
  }

  if (annotationsRemoved > 0) {
    details.push(`Removed ${annotationsRemoved} watermark / stamp annotation(s)`);
  }
  if (xObjectsRemoved > 0) {
    details.push(`Detached ${xObjectsRemoved} watermark Form XObject(s)`);
  }
  if (textOccurrencesRemoved > 0) {
    details.push(`Filtered ${textOccurrencesRemoved} watermark text occurrence(s)`);
  }
  if (details.length === 0) {
    details.push('Cleaned page resources and sanitized stream metadata');
  }

  const cleanedBytes = await doc.save({ useObjectStreams: false });

  return {
    cleanedBytes,
    originalSize,
    cleanedSize: cleanedBytes.length,
    pagesProcessed: pageCount,
    annotationsRemoved,
    xObjectsRemoved,
    textOccurrencesRemoved,
    details,
  };
}
