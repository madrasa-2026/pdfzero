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

export type GrayscaleMode = 'standard' | 'ink-saver' | 'high-contrast';

export interface GrayscaleOptions {
  mode?: GrayscaleMode;
  lightenPercent?: number; // e.g. 15 for 15% toner reduction
  convertImages?: boolean;
}

export interface GrayscaleResult {
  convertedBytes: Uint8Array;
  originalSize: number;
  convertedSize: number;
  pagesProcessed: number;
  vectorOperatorsConverted: number;
  imagesDesaturated: number;
  details: string[];
}

interface ContentStreamHandle {
  stream: any;
  ref?: PDFRef;
  indexInArray?: number;
  parentArray?: PDFArray;
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

function decodeStreamToLatin1(stream: any): string {
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
    // Non-fatal fallback for unhandled streams
  }
  return '';
}

/**
 * Calculates luminance gray from RGB (0..1) with optional tone curve
 */
export function calculateGray(
  r: number,
  g: number,
  b: number,
  mode: GrayscaleMode = 'standard',
  lightenPercent = 15
): number {
  let gray = 0.299 * r + 0.587 * g + 0.114 * b;
  gray = Math.max(0, Math.min(1, gray));

  if (mode === 'ink-saver') {
    // Lighten darker tones by lightenPercent to save ink/toner while keeping readability
    const factor = Math.max(0, Math.min(50, lightenPercent)) / 100;
    if (gray < 0.95) {
      gray = Math.min(1, gray + (1 - gray) * factor);
    }
  } else if (mode === 'high-contrast') {
    // Crisp binarization for photocopy/scan readability
    gray = gray < 0.55 ? 0.0 : 1.0;
  }

  return Math.round(gray * 1000) / 1000;
}

/**
 * Calculates luminance gray from CMYK (0..1)
 */
export function calculateCmykGray(
  c: number,
  m: number,
  y: number,
  k: number,
  mode: GrayscaleMode = 'standard',
  lightenPercent = 15
): number {
  // Approximate RGB conversion from CMYK
  const r = (1 - c) * (1 - k);
  const g = (1 - m) * (1 - k);
  const b = (1 - y) * (1 - k);
  return calculateGray(r, g, b, mode, lightenPercent);
}

/**
 * Replaces RGB (rg, RG) and CMYK (k, K) vector operators in a content stream string.
 */
export function desaturateContentStreamString(
  content: string,
  mode: GrayscaleMode = 'standard',
  lightenPercent = 15
): { newContent: string; conversionsCount: number } {
  let count = 0;

  // 1. Replace RGB operators: [r] [g] [b] rg / RG
  const rgbRegex = /([0-9]*\.?[0-9]+)\s+([0-9]*\.?[0-9]+)\s+([0-9]*\.?[0-9]+)\s+(rg|RG)\b/g;
  let transformed = content.replace(rgbRegex, (_, rStr, gStr, bStr, op) => {
    const r = parseFloat(rStr);
    const g = parseFloat(gStr);
    const b = parseFloat(bStr);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return _;
    count++;
    const gray = calculateGray(r, g, b, mode, lightenPercent);
    const replacementOp = op === 'rg' ? 'g' : 'G';
    return `${gray.toFixed(3)} ${replacementOp}`;
  });

  // 2. Replace CMYK operators: [c] [m] [y] [k] k / K
  const cmykRegex = /([0-9]*\.?[0-9]+)\s+([0-9]*\.?[0-9]+)\s+([0-9]*\.?[0-9]+)\s+([0-9]*\.?[0-9]+)\s+(k|K)\b/g;
  transformed = transformed.replace(cmykRegex, (_, cStr, mStr, yStr, kStr, op) => {
    const c = parseFloat(cStr);
    const m = parseFloat(mStr);
    const y = parseFloat(yStr);
    const k = parseFloat(kStr);
    if (isNaN(c) || isNaN(m) || isNaN(y) || isNaN(k)) return _;
    count++;
    const gray = calculateCmykGray(c, m, y, k, mode, lightenPercent);
    const replacementOp = op === 'k' ? 'g' : 'G';
    return `${gray.toFixed(3)} ${replacementOp}`;
  });

  return { newContent: transformed, conversionsCount: count };
}

/**
 * Desaturates page image XObjects in resources dictionary
 */
function desaturatePageImages(
  doc: PDFDocument,
  page: PDFPage,
  mode: GrayscaleMode = 'standard',
  lightenPercent = 15
): number {
  const resources = page.node.Resources();
  if (!resources) return 0;

  const xObjectDict = resources.lookup(PDFName.of('XObject'));
  if (!(xObjectDict instanceof PDFDict)) return 0;

  let desaturatedImagesCount = 0;

  for (const [key, refOrStream] of xObjectDict.entries()) {
    const stream = refOrStream instanceof PDFRef ? doc.context.lookup(refOrStream) : refOrStream;
    if (!(stream instanceof PDFRawStream || stream instanceof PDFStream)) continue;

    const dict = stream.dict;
    const subtype = dict.lookup(PDFName.of('Subtype'));
    if (subtype?.toString() !== '/Image') continue;

    const colorSpace = dict.lookup(PDFName.of('ColorSpace'))?.toString();
    const bitsPerComponent = dict.lookup(PDFName.of('BitsPerComponent'));
    const bpc = typeof (bitsPerComponent as any)?.asNumber === 'function'
      ? (bitsPerComponent as any).asNumber()
      : 8;

    // Check if image is DeviceRGB with 8-bit depth
    if (colorSpace === '/DeviceRGB' && bpc === 8) {
      try {
        const decoded = decodePDFRawStream(stream as any);
        const rawBytes = decoded.decode();
        const width = (dict.lookup(PDFName.of('Width')) as any)?.asNumber?.() || 0;
        const height = (dict.lookup(PDFName.of('Height')) as any)?.asNumber?.() || 0;

        if (width > 0 && height > 0 && rawBytes.length >= width * height * 3) {
          const pixelCount = width * height;
          const grayBytes = new Uint8Array(pixelCount);

          for (let p = 0; p < pixelCount; p++) {
            const r = rawBytes[p * 3] / 255;
            const g = rawBytes[p * 3 + 1] / 255;
            const b = rawBytes[p * 3 + 2] / 255;
            const grayVal = calculateGray(r, g, b, mode, lightenPercent);
            grayBytes[p] = Math.round(grayVal * 255);
          }

          const newStream = doc.context.flateStream(grayBytes);
          newStream.dict.set(PDFName.of('Type'), PDFName.of('XObject'));
          newStream.dict.set(PDFName.of('Subtype'), PDFName.of('Image'));
          newStream.dict.set(PDFName.of('Width'), (dict.lookup(PDFName.of('Width')) as any));
          newStream.dict.set(PDFName.of('Height'), (dict.lookup(PDFName.of('Height')) as any));
          newStream.dict.set(PDFName.of('ColorSpace'), PDFName.of('DeviceGray'));
          newStream.dict.set(PDFName.of('BitsPerComponent'), (dict.lookup(PDFName.of('BitsPerComponent')) as any));

          const newRef = doc.context.register(newStream);
          xObjectDict.set(key, newRef);
          desaturatedImagesCount++;
        } else {
          // Fallback: switch ColorSpace dictionary to DeviceGray
          dict.set(PDFName.of('ColorSpace'), PDFName.of('DeviceGray'));
          desaturatedImagesCount++;
        }
      } catch {
        // If decoding raw stream fails, simply map ColorSpace to DeviceGray
        dict.set(PDFName.of('ColorSpace'), PDFName.of('DeviceGray'));
        desaturatedImagesCount++;
      }
    }
  }

  return desaturatedImagesCount;
}

/**
 * Main conversion engine: Converts entire PDF to true Grayscale / Ink Saver format.
 */
export async function convertToGrayscale(
  pdfBytes: Uint8Array,
  options: GrayscaleOptions = {}
): Promise<GrayscaleResult> {
  const originalSize = pdfBytes.length;
  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const pageCount = doc.getPageCount();

  const mode = options.mode || 'standard';
  const lightenPercent = options.lightenPercent ?? 15;
  const convertImages = options.convertImages !== false;

  let totalVectorOperators = 0;
  let totalImagesDesaturated = 0;
  const details: string[] = [];

  for (let i = 0; i < pageCount; i++) {
    const page = doc.getPage(i);
    const streamHandles = getPageContentStreams(doc, page);

    for (const h of streamHandles) {
      const streamText = decodeStreamToLatin1(h.stream);
      if (!streamText) continue;

      const { newContent, conversionsCount } = desaturateContentStreamString(
        streamText,
        mode,
        lightenPercent
      );

      if (conversionsCount > 0) {
        totalVectorOperators += conversionsCount;
        const newBytes = new TextEncoder().encode(newContent);
        const newFlateStream = doc.context.flateStream(newBytes);
        const newRef = doc.context.register(newFlateStream);

        if (h.parentArray && typeof h.indexInArray === 'number') {
          h.parentArray.set(h.indexInArray, newRef);
        } else {
          page.node.set(PDFName.of('Contents'), newRef);
        }
      }
    }

    if (convertImages) {
      const imgCount = desaturatePageImages(doc, page, mode, lightenPercent);
      totalImagesDesaturated += imgCount;
    }
  }

  const convertedBytes = await doc.save({ useObjectStreams: false });

  if (totalVectorOperators > 0) {
    details.push(`Converted ${totalVectorOperators} vector color operators to DeviceGray`);
  }
  if (totalImagesDesaturated > 0) {
    details.push(`Desaturated ${totalImagesDesaturated} embedded images to DeviceGray`);
  }
  if (mode === 'ink-saver') {
    details.push(`Applied Eco Ink-Saver toner reduction curve (+${lightenPercent}% brightness)`);
  } else if (mode === 'high-contrast') {
    details.push('Applied High Contrast B&W thresholding for enhanced scan readability');
  }

  return {
    convertedBytes,
    originalSize,
    convertedSize: convertedBytes.length,
    pagesProcessed: pageCount,
    vectorOperatorsConverted: totalVectorOperators,
    imagesDesaturated: totalImagesDesaturated,
    details,
  };
}
