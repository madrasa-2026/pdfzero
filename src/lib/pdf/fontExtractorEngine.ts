import { PDFDocument, PDFName, PDFDict, PDFRawStream, decodePDFRawStream } from 'pdf-lib';
import JSZip from 'jszip';

export interface ExtractedFont {
  id: string;
  fontName: string;
  cleanFamilyName: string;
  subtype: string;
  format: 'ttf' | 'otf' | 'woff' | 'woff2' | 'cff' | 'pfb';
  extension: string;
  data: Uint8Array;
  sizeBytes: number;
  sizeFormatted: string;
  isSubset: boolean;
}

export interface FontExtractionResult {
  fonts: ExtractedFont[];
  totalEmbeddedCount: number;
  totalSizeFormatted: string;
}

/**
 * Strips 6-character random subset prefixes like "ABCDEF+Helvetica" -> "Helvetica"
 */
export function cleanFontFamilyName(rawName: string): string {
  if (!rawName) return 'CustomFont';
  let name = rawName.replace(/^\//, '').trim();
  // Check for subset prefix e.g. "ABCDEF+Roboto-Bold"
  const subsetRegex = /^[A-Z]{6}\+(.+)$/;
  const match = name.match(subsetRegex);
  if (match) {
    return match[1];
  }
  return name;
}

/**
 * Inspects font binary magic bytes to determine the exact format.
 */
export function detectFontFormat(
  data: Uint8Array,
  fallbackFormat: 'ttf' | 'otf' | 'cff' | 'pfb' = 'ttf'
): 'ttf' | 'otf' | 'woff' | 'woff2' | 'cff' | 'pfb' {
  if (data.length < 4) return fallbackFormat;

  // OpenType with CFF outlines: 'OTTO'
  if (data[0] === 0x4F && data[1] === 0x54 && data[2] === 0x54 && data[3] === 0x4F) {
    return 'otf';
  }

  // TrueType 1.0 magic: 0x00 0x01 0x00 0x00 or 'true' (0x74 0x72 0x75 0x65)
  if (
    (data[0] === 0x00 && data[1] === 0x01 && data[2] === 0x00 && data[3] === 0x00) ||
    (data[0] === 0x74 && data[1] === 0x72 && data[2] === 0x75 && data[3] === 0x65)
  ) {
    return 'ttf';
  }

  // WOFF: 'wOFF'
  if (data[0] === 0x77 && data[1] === 0x4F && data[2] === 0x46 && data[3] === 0x46) {
    return 'woff';
  }

  // WOFF2: 'wOF2'
  if (data[0] === 0x77 && data[1] === 0x4F && data[2] === 0x46 && data[3] === 0x32) {
    return 'woff2';
  }

  return fallbackFormat;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Extracts all embedded TrueType, OpenType, and CFF fonts from a PDF.
 */
export async function extractEmbeddedFonts(pdfBytes: Uint8Array): Promise<FontExtractionResult> {
  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const context = doc.context;
  const indirectObjects = context.enumerateIndirectObjects();

  const extracted: ExtractedFont[] = [];
  const processedStreamRefs = new Set<string>();

  // Helper map: FontDescriptor ref -> parent Font Subtype
  const fontSubtypeMap = new Map<string, string>();
  for (const [ref, obj] of indirectObjects) {
    if (obj instanceof PDFDict && obj.get(PDFName.of('Type'))?.toString() === '/Font') {
      const descRef = obj.get(PDFName.of('FontDescriptor'));
      const subtype = obj.get(PDFName.of('Subtype'))?.toString()?.replace(/^\//, '') || 'Unknown';
      if (descRef) {
        fontSubtypeMap.set(descRef.toString(), subtype);
      }
    }
  }

  let fontIdCounter = 1;

  for (const [ref, obj] of indirectObjects) {
    if (!(obj instanceof PDFDict)) continue;

    const type = obj.get(PDFName.of('Type'))?.toString();
    if (type !== '/FontDescriptor') continue;

    const rawFontName = obj.get(PDFName.of('FontName'))?.toString() || `Font_${fontIdCounter}`;
    const cleanName = cleanFontFamilyName(rawFontName);
    const isSubset = /^[A-Z]{6}\+/.test(rawFontName.replace(/^\//, ''));
    const subtype = fontSubtypeMap.get(ref.toString()) || 'TrueType';

    // Check /FontFile2 (TrueType)
    const ff2Ref = obj.get(PDFName.of('FontFile2'));
    // Check /FontFile3 (OpenType / CFF)
    const ff3Ref = obj.get(PDFName.of('FontFile3'));
    // Check /FontFile (Type 1 PostScript)
    const ff1Ref = obj.get(PDFName.of('FontFile'));

    const targetRef = ff2Ref || ff3Ref || ff1Ref;
    if (!targetRef) continue;

    const targetKey = targetRef.toString();
    if (processedStreamRefs.has(targetKey)) continue;
    processedStreamRefs.add(targetKey);

    try {
      const streamObj = context.lookup(targetRef);
      if (!(streamObj instanceof PDFRawStream)) continue;

      const rawFontBytes = decodePDFRawStream(streamObj).getBytes();
      if (!rawFontBytes || rawFontBytes.length === 0) continue;

      let defaultFormat: 'ttf' | 'otf' | 'cff' | 'pfb' = 'ttf';
      if (ff3Ref) defaultFormat = 'otf';
      else if (ff1Ref) defaultFormat = 'pfb';

      const detectedFormat = detectFontFormat(rawFontBytes, defaultFormat);
      const extension = `.${detectedFormat}`;

      extracted.push({
        id: `font_${fontIdCounter++}`,
        fontName: rawFontName.replace(/^\//, ''),
        cleanFamilyName: cleanName,
        subtype,
        format: detectedFormat,
        extension,
        data: rawFontBytes,
        sizeBytes: rawFontBytes.length,
        sizeFormatted: formatBytes(rawFontBytes.length),
        isSubset
      });
    } catch (err) {
      console.warn(`Could not decode font stream for ${rawFontName}:`, err);
    }
  }

  const totalBytes = extracted.reduce((acc, f) => acc + f.sizeBytes, 0);

  return {
    fonts: extracted,
    totalEmbeddedCount: extracted.length,
    totalSizeFormatted: formatBytes(totalBytes)
  };
}

/**
 * Packages all extracted fonts into a downloadable ZIP archive with manifest.
 */
export async function createFontsZip(
  fonts: ExtractedFont[],
  originalPdfName: string = 'document.pdf'
): Promise<Uint8Array> {
  const zip = new JSZip();
  const folder = zip.folder('extracted_fonts') || zip;

  let manifestText = `Extracted Fonts Manifest\n`;
  manifestText += `Source Document: ${originalPdfName}\n`;
  manifestText += `Extraction Date: ${new Date().toISOString()}\n`;
  manifestText += `Total Fonts: ${fonts.length}\n\n`;
  manifestText += `------------------------------------------------------------\n`;

  const usedFilenames = new Set<string>();

  fonts.forEach((font, idx) => {
    let baseFilename = font.cleanFamilyName.replace(/[^a-zA-Z0-9_-]/g, '_');
    if (!baseFilename) baseFilename = `Font_${idx + 1}`;
    let filename = `${baseFilename}${font.extension}`;
    let counter = 1;
    while (usedFilenames.has(filename)) {
      filename = `${baseFilename}_${counter++}${font.extension}`;
    }
    usedFilenames.add(filename);

    folder.file(filename, font.data);

    manifestText += `${idx + 1}. ${filename}\n`;
    manifestText += `   - Original PostScript Name: ${font.fontName}\n`;
    manifestText += `   - Subtype: ${font.subtype}\n`;
    manifestText += `   - Format: ${font.format.toUpperCase()}\n`;
    manifestText += `   - Size: ${font.sizeFormatted}\n`;
    manifestText += `   - Character Subset: ${font.isSubset ? 'Yes (SubsetFont)' : 'Full Embedding'}\n\n`;
  });

  manifestText += `------------------------------------------------------------\n`;
  manifestText += `Note: Extracted for typography inspection and digital archiving.\n`;
  manifestText += `Check respective foundry copyright licenses before commercial redistribution.\n`;

  zip.file('MANIFEST.txt', manifestText);

  return await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}
