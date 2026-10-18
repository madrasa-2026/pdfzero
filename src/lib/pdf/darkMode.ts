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

export type DarkModeTheme = 'midnight' | 'sepia' | 'oled' | 'solarized';

export interface DarkModeOptions {
  theme?: DarkModeTheme;
  invertImages?: boolean;
  pageRange?: string; // e.g. "all" or "1-5, 8"
}

export interface DarkModeResult {
  outputBytes: Uint8Array;
  originalSize: number;
  outputSize: number;
  pagesProcessed: number;
  theme: DarkModeTheme;
  operatorsConverted: number;
}

export const THEME_PALETTES: Record<
  DarkModeTheme,
  { bg: [number, number, number]; fg: [number, number, number]; name: string }
> = {
  midnight: {
    name: 'Midnight Slate',
    bg: [0.071, 0.071, 0.071], // #121212
    fg: [0.886, 0.910, 0.941], // #e2e8f0
  },
  sepia: {
    name: 'Warm Sepia',
    bg: [0.984, 0.941, 0.851], // #fbf0d9
    fg: [0.220, 0.169, 0.114], // #382b1d
  },
  oled: {
    name: 'OLED Pitch Black',
    bg: [0.0, 0.0, 0.0],       // #000000
    fg: [1.0, 1.0, 1.0],       // #ffffff
  },
  solarized: {
    name: 'Solarized Dark',
    bg: [0.0, 0.169, 0.212],   // #002b36
    fg: [0.514, 0.580, 0.588], // #839496
  },
};

/**
 * Transforms an RGB color (0..1) to match the selected dark theme
 */
export function transformRgbForTheme(
  r: number,
  g: number,
  b: number,
  theme: DarkModeTheme = 'midnight'
): [number, number, number] {
  const palette = THEME_PALETTES[theme] || THEME_PALETTES.midnight;
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

  if (theme === 'oled') {
    if (luminance < 0.25) {
      return [palette.fg[0], palette.fg[1], palette.fg[2]];
    }
    if (luminance > 0.80) {
      return [palette.bg[0], palette.bg[1], palette.bg[2]];
    }
    return [
      Math.round((1 - r) * 1000) / 1000,
      Math.round((1 - g) * 1000) / 1000,
      Math.round((1 - b) * 1000) / 1000,
    ];
  }

  if (theme === 'sepia') {
    // Sepia: Dark text stays dark espresso; bright backgrounds become parchment
    if (luminance < 0.3) {
      return [palette.fg[0], palette.fg[1], palette.fg[2]];
    }
    if (luminance > 0.8) {
      return [palette.bg[0], palette.bg[1], palette.bg[2]];
    }
    // Midtones: shift toward warm sepia
    return [
      Math.min(1, Math.round((r * 0.393 + g * 0.769 + b * 0.189) * 1000) / 1000),
      Math.min(1, Math.round((r * 0.349 + g * 0.686 + b * 0.168) * 1000) / 1000),
      Math.min(1, Math.round((r * 0.272 + g * 0.534 + b * 0.131) * 1000) / 1000),
    ];
  }

  // Midnight & Solarized themes
  if (luminance < 0.25) {
    // Dark text/graphics become theme foreground text
    return [palette.fg[0], palette.fg[1], palette.fg[2]];
  }

  if (luminance > 0.85) {
    // Bright white/light backgrounds become theme dark background
    return [palette.bg[0], palette.bg[1], palette.bg[2]];
  }

  // Midtone colors: invert luminance while preserving hue
  const invL = 1 - luminance;
  const scale = invL / Math.max(luminance, 0.05);
  return [
    Math.min(1, Math.max(0, Math.round(r * scale * 1000) / 1000)),
    Math.min(1, Math.max(0, Math.round(g * scale * 1000) / 1000)),
    Math.min(1, Math.max(0, Math.round(b * scale * 1000) / 1000)),
  ];
}

/**
 * Transforms a single grayscale value (0..1) to match the selected dark theme
 */
export function transformGrayForTheme(
  gray: number,
  theme: DarkModeTheme = 'midnight'
): number {
  const [r, g, b] = transformRgbForTheme(gray, gray, gray, theme);
  const newL = 0.299 * r + 0.587 * g + 0.114 * b;
  return Math.round(newL * 1000) / 1000;
}

/**
 * Replaces vector color operators in a PDF content stream
 */
export function transformContentStreamForDarkMode(
  content: string,
  theme: DarkModeTheme = 'midnight'
): { newContent: string; opsCount: number } {
  let count = 0;

  // 1. RGB operators: r g b rg (fill) and RG (stroke)
  const rgbRegex = /([0-9]*\.?[0-9]+)\s+([0-9]*\.?[0-9]+)\s+([0-9]*\.?[0-9]+)\s+(rg|RG)\b/g;
  let transformed = content.replace(rgbRegex, (_, rStr, gStr, bStr, op) => {
    const r = parseFloat(rStr);
    const g = parseFloat(gStr);
    const b = parseFloat(bStr);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return _;
    count++;
    const [nr, ng, nb] = transformRgbForTheme(r, g, b, theme);
    return `${nr.toFixed(3)} ${ng.toFixed(3)} ${nb.toFixed(3)} ${op}`;
  });

  // 2. Grayscale operators: g (fill) and G (stroke)
  const grayRegex = /([0-9]*\.?[0-9]+)\s+(g|G)\b/g;
  transformed = transformed.replace(grayRegex, (_, gStr, op) => {
    const gray = parseFloat(gStr);
    if (isNaN(gray)) return _;
    count++;
    const [nr, ng, nb] = transformRgbForTheme(gray, gray, gray, theme);
    // Use RGB operator to allow theme colored tinting
    const replacementOp = op === 'g' ? 'rg' : 'RG';
    return `${nr.toFixed(3)} ${ng.toFixed(3)} ${nb.toFixed(3)} ${replacementOp}`;
  });

  // 3. CMYK operators: c m y k k (fill) and K (stroke)
  const cmykRegex = /([0-9]*\.?[0-9]+)\s+([0-9]*\.?[0-9]+)\s+([0-9]*\.?[0-9]+)\s+([0-9]*\.?[0-9]+)\s+(k|K)\b/g;
  transformed = transformed.replace(cmykRegex, (_, cStr, mStr, yStr, kStr, op) => {
    const c = parseFloat(cStr);
    const m = parseFloat(mStr);
    const y = parseFloat(yStr);
    const k = parseFloat(kStr);
    if (isNaN(c) || isNaN(m) || isNaN(y) || isNaN(k)) return _;
    count++;
    const r = (1 - c) * (1 - k);
    const g = (1 - m) * (1 - k);
    const b = (1 - y) * (1 - k);
    const [nr, ng, nb] = transformRgbForTheme(r, g, b, theme);
    const replacementOp = op === 'k' ? 'rg' : 'RG';
    return `${nr.toFixed(3)} ${ng.toFixed(3)} ${nb.toFixed(3)} ${replacementOp}`;
  });

  return { newContent: transformed, opsCount: count };
}

/**
 * Prepends a solid theme background rectangle before all page contents
 */
export function prependPageBackground(
  doc: PDFDocument,
  page: PDFPage,
  theme: DarkModeTheme = 'midnight'
): void {
  const palette = THEME_PALETTES[theme] || THEME_PALETTES.midnight;
  const [bgR, bgG, bgB] = palette.bg;
  const width = page.getWidth();
  const height = page.getHeight();

  const bgStreamContent = `q\n${bgR.toFixed(3)} ${bgG.toFixed(3)} ${bgB.toFixed(3)} rg\n0 0 ${width.toFixed(2)} ${height.toFixed(2)} re\nf\nQ\n`;
  const bgStream = doc.context.stream(bgStreamContent);
  const bgRef = doc.context.register(bgStream);

  const contents = page.node.Contents();

  if (!contents) {
    page.node.set(PDFName.of('Contents'), bgRef);
  } else if (contents instanceof PDFArray) {
    contents.insert(0, bgRef);
  } else if (contents instanceof PDFRef) {
    const newArray = doc.context.obj([bgRef, contents]);
    page.node.set(PDFName.of('Contents'), newArray);
  } else if (contents instanceof PDFStream || contents instanceof PDFRawStream) {
    const existingRef = doc.context.register(contents);
    const newArray = doc.context.obj([bgRef, existingRef]);
    page.node.set(PDFName.of('Contents'), newArray);
  }
}

/**
 * Decodes a raw or flate stream into a latin1 string
 */
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
    // Non-fatal stream decode fallback
  }
  return '';
}

/**
 * Inverts raw image XObjects embedded on the page
 */
export function invertImageXObjects(doc: PDFDocument, page: PDFPage): number {
  const resources = page.node.Resources();
  if (!resources) return 0;

  const xObjectDict = resources.lookup(PDFName.of('XObject'));
  if (!(xObjectDict instanceof PDFDict)) return 0;

  let invertedCount = 0;

  for (const [, refOrStream] of xObjectDict.entries()) {
    const stream = refOrStream instanceof PDFRef ? doc.context.lookup(refOrStream) : refOrStream;
    if (!(stream instanceof PDFRawStream || stream instanceof PDFStream)) continue;

    const dict = stream.dict;
    const subtype = dict.lookup(PDFName.of('Subtype'));
    if (subtype?.toString() !== '/Image') continue;

    const filter = dict.lookup(PDFName.of('Filter'))?.toString();
    // Invert uncompressed or FlateDecode images
    if (!filter || filter === '/FlateDecode') {
      try {
        let rawBytes: Uint8Array | null = null;
        if (dict.has(PDFName.of('Filter'))) {
          const decoded = decodePDFRawStream(stream);
          rawBytes = decoded.decode();
        } else if (typeof stream.asUint8Array === 'function') {
          rawBytes = stream.asUint8Array();
        }

        if (rawBytes && rawBytes.length > 0) {
          const inverted = new Uint8Array(rawBytes.length);
          for (let i = 0; i < rawBytes.length; i++) {
            inverted[i] = 255 - rawBytes[i];
          }
          const newStream = doc.context.flateStream(inverted);
          // Preserve image metadata
          for (const [key, value] of dict.entries()) {
            if (key.toString() !== '/Length' && key.toString() !== '/Filter') {
              newStream.dict.set(key, value);
            }
          }
          if (refOrStream instanceof PDFRef) {
            doc.context.assign(refOrStream, newStream);
          }
          invertedCount++;
        }
      } catch {
        // Silently skip corrupted image streams
      }
    }
  }

  return invertedCount;
}

/**
 * Main conversion engine: converts an input PDF into Dark Mode
 */
export async function convertPdfToDarkMode(
  pdfBytes: Uint8Array,
  options: DarkModeOptions = {}
): Promise<DarkModeResult> {
  const theme = options.theme || 'midnight';
  const invertImages = options.invertImages !== false;

  const doc = await PDFDocument.load(pdfBytes, {
    updateMetadata: false,
    ignoreEncryption: true,
  });

  const pageCount = doc.getPageCount();
  let totalOpsConverted = 0;

  for (let i = 0; i < pageCount; i++) {
    const page = doc.getPage(i);

    // 1. Prepend solid theme background rectangle behind all content
    prependPageBackground(doc, page, theme);

    // 2. Transform content streams for dark mode colors
    const contents = page.node.Contents();
    const streamHandles: { stream: any; ref?: PDFRef }[] = [];

    if (contents instanceof PDFRef) {
      const s = doc.context.lookup(contents);
      if (s) streamHandles.push({ stream: s, ref: contents });
    } else if (contents instanceof PDFArray) {
      // Note: index 0 is our newly prepended background, so start at index 1
      for (let idx = 1; idx < contents.size(); idx++) {
        const item = contents.get(idx);
        if (item instanceof PDFRef) {
          const s = doc.context.lookup(item);
          if (s) streamHandles.push({ stream: s, ref: item });
        } else if (item) {
          streamHandles.push({ stream: item });
        }
      }
    }

    for (const handle of streamHandles) {
      const originalStr = decodeStreamToLatin1(handle.stream);
      if (!originalStr) continue;

      const { newContent, opsCount } = transformContentStreamForDarkMode(originalStr, theme);
      totalOpsConverted += opsCount;

      if (opsCount > 0) {
        const replacementBytes = new TextEncoder().encode(newContent);
        const replacementStream = doc.context.flateStream(replacementBytes);
        if (handle.ref) {
          doc.context.assign(handle.ref, replacementStream);
        }
      }
    }

    // 3. Invert raster images if enabled
    if (invertImages) {
      invertImageXObjects(doc, page);
    }
  }

  const outputBytes = await doc.save();

  return {
    outputBytes,
    originalSize: pdfBytes.length,
    outputSize: outputBytes.length,
    pagesProcessed: pageCount,
    theme,
    operatorsConverted: totalOpsConverted,
  };
}
