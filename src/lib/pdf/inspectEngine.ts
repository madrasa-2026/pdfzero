import { PDFDocument, PDFDict, PDFName, PDFStream, PDFRawStream, PDFArray, decodePDFRawStream } from 'pdf-lib';

export interface FontInfo {
  name: string;
  subtype: string;
  isSubset: boolean;
  isEmbedded: boolean;
}

export interface ImagePreflightInfo {
  width: number;
  height: number;
  colorSpace: string;
  bitsPerComponent: number;
  filter: string;
}

export interface SecurityAuditReport {
  hasJavaScript: boolean;
  hasLaunchActions: boolean;
  hasEmbeddedFiles: boolean;
  hasAcroForm: boolean;
  hasSignatures: boolean;
  isEncrypted: boolean;
  warnings: string[];
}

export interface PdfInspectionReport {
  summary: {
    pdfVersion: string;
    fileSizeBytes: number;
    pageCount: number;
    revisionCount: number;
    totalIndirectObjects: number;
    isEncrypted: boolean;
    producer?: string;
    creator?: string;
    creationDate?: string;
    modDate?: string;
  };
  security: SecurityAuditReport;
  fonts: FontInfo[];
  images: ImagePreflightInfo[];
  objectTypeCounts: Record<string, number>;
  page1RawStreamSample?: string;
}

/**
 * Inspects a PDF binary at the byte and object-database level to extract forensic,
 * prepress, security, and structural metadata without uploading to any server.
 */
export async function inspectPdfDocument(pdfBytes: Uint8Array): Promise<PdfInspectionReport> {
  const decoder = new TextDecoder('latin1');
  const rawText = decoder.decode(pdfBytes);

  // 1. Header Version & Incremental Revisions
  const versionMatch = rawText.match(/%PDF-([0-9]+\.[0-9]+)/);
  const pdfVersion = versionMatch ? versionMatch[1] : '1.7';

  const eofMatches = (rawText.match(/%%EOF/g) || []).length;
  const startxrefMatches = (rawText.match(/\bstartxref\b/g) || []).length;
  const revisionCount = Math.max(1, Math.max(eofMatches, startxrefMatches));

  // 2. High-speed Security Regex Scan
  const hasJavaScript = /\/JavaScript|\/JS\b/.test(rawText);
  const hasLaunchActions = /\/Launch\b/.test(rawText);
  const hasEmbeddedFiles = /\/EmbeddedFiles\b/.test(rawText);
  const hasAcroForm = /\/AcroForm\b/.test(rawText);
  const hasSignatures = /\/ByteRange\b|\/SigFlags\b/.test(rawText);
  const isEncrypted = /\/Encrypt\b/.test(rawText);

  const warnings: string[] = [];
  if (hasJavaScript) warnings.push('Executable JavaScript detected (/JavaScript). Could execute actions on open.');
  if (hasLaunchActions) warnings.push('Launch action detected (/Launch). May attempt to spawn external local processes.');
  if (hasEmbeddedFiles) warnings.push('Embedded file payload detected (/EmbeddedFiles). Review attachments.');
  if (revisionCount > 1) warnings.push(`Document has ${revisionCount} incremental revisions. Earlier versions may remain in file history.`);

  // 3. Load with pdf-lib for object model traversal
  let doc: PDFDocument;
  let pageCount = 0;
  let producer: string | undefined;
  let creator: string | undefined;
  let creationDate: string | undefined;
  let modDate: string | undefined;

  try {
    doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    pageCount = doc.getPageCount();
    producer = doc.getProducer();
    creator = doc.getCreator();
    creationDate = doc.getCreationDate()?.toISOString();
    modDate = doc.getModificationDate()?.toISOString();
  } catch (err: any) {
    // If standard parsing fails, return partial forensic scan
    return {
      summary: {
        pdfVersion,
        fileSizeBytes: pdfBytes.length,
        pageCount: 0,
        revisionCount,
        totalIndirectObjects: 0,
        isEncrypted,
      },
      security: {
        hasJavaScript,
        hasLaunchActions,
        hasEmbeddedFiles,
        hasAcroForm,
        hasSignatures,
        isEncrypted,
        warnings: [...warnings, 'PDF object catalog is unreadable or encrypted: ' + err.message],
      },
      fonts: [],
      images: [],
      objectTypeCounts: {},
    };
  }

  // 4. Traverse Indirect Objects
  const fontMap = new Map<string, FontInfo>();
  const images: ImagePreflightInfo[] = [];
  const objectTypeCounts: Record<string, number> = {};

  const indirectObjects = doc.context.enumerateIndirectObjects();
  const totalIndirectObjects = indirectObjects.length;

  for (const [, obj] of indirectObjects) {
    if (!(obj instanceof PDFDict)) continue;

    const typeObj = obj.get(PDFName.of('Type'));
    const typeName = typeObj instanceof PDFName ? typeObj.asString() : 'Dict';
    objectTypeCounts[typeName] = (objectTypeCounts[typeName] || 0) + 1;

    // Detect Fonts
    if (typeName === '/Font') {
      const baseFont = obj.get(PDFName.of('BaseFont'));
      const subtype = obj.get(PDFName.of('Subtype'));
      const fontName = baseFont instanceof PDFName ? baseFont.asString().replace(/^\//, '') : 'UnnamedFont';
      const fontSubtype = subtype instanceof PDFName ? subtype.asString().replace(/^\//, '') : 'Unknown';

      // Check if subset (PDF standard: 6 uppercase Latin letters followed by '+')
      const isSubset = /^[A-Z]{6}\+/.test(fontName);
      const fontDescriptor = obj.get(PDFName.of('FontDescriptor'));
      const isEmbedded = fontDescriptor instanceof PDFDict && (
        fontDescriptor.has(PDFName.of('FontFile')) ||
        fontDescriptor.has(PDFName.of('FontFile2')) ||
        fontDescriptor.has(PDFName.of('FontFile3'))
      );

      const cleanName = fontName.replace(/^[A-Z]{6}\+/, '');
      if (!fontMap.has(fontName)) {
        fontMap.set(fontName, {
          name: cleanName,
          subtype: fontSubtype,
          isSubset,
          isEmbedded: isEmbedded || isSubset,
        });
      }
    }

    // Detect Image XObjects
    const subtypeObj = obj.get(PDFName.of('Subtype'));
    if (subtypeObj instanceof PDFName && subtypeObj.asString() === '/Image') {
      const widthObj = obj.get(PDFName.of('Width'));
      const heightObj = obj.get(PDFName.of('Height'));
      const colorSpaceObj = obj.get(PDFName.of('ColorSpace'));
      const bitsObj = obj.get(PDFName.of('BitsPerComponent'));
      const filterObj = obj.get(PDFName.of('Filter'));

      const width = Number(widthObj?.toString() || 0);
      const height = Number(heightObj?.toString() || 0);
      const colorSpace = colorSpaceObj instanceof PDFName ? colorSpaceObj.asString().replace(/^\//, '') : 'DeviceRGB';
      const bitsPerComponent = Number(bitsObj?.toString() || 8);
      const filter = filterObj instanceof PDFName ? filterObj.asString().replace(/^\//, '') : (filterObj?.toString() || 'None');

      if (width > 0 && height > 0) {
        images.push({ width, height, colorSpace, bitsPerComponent, filter });
      }
    }
  }

  // 5. Decompress Page 1 Content Stream Sample
  let page1RawStreamSample: string | undefined;
  if (pageCount > 0) {
    try {
      const page1 = doc.getPage(0);
      const contentsRef = page1.node.Contents();
      if (contentsRef) {
        const refs = contentsRef instanceof PDFArray ? contentsRef.asArray() : [contentsRef];
        const chunks: Uint8Array[] = [];

        for (const ref of refs) {
          const streamObj = doc.context.lookup(ref);
          if (streamObj instanceof PDFRawStream) {
            try {
              const decoded = decodePDFRawStream(streamObj);
              if (decoded && typeof (decoded as any).getBytes === 'function') {
                chunks.push((decoded as any).getBytes());
              } else {
                chunks.push(streamObj.getContents());
              }
            } catch {
              chunks.push(streamObj.getContents());
            }
          } else if (streamObj instanceof PDFStream) {
            chunks.push(streamObj.getContents());
          }
        }

        if (chunks.length > 0) {
          const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
          const merged = new Uint8Array(totalLen);
          let offset = 0;
          for (const c of chunks) {
            merged.set(c, offset);
            offset += c.length;
          }
          page1RawStreamSample = new TextDecoder('latin1').decode(merged.slice(0, 5000));
        }
      }
    } catch {
      // Content stream decompression failure is non-blocking
    }
  }

  return {
    summary: {
      pdfVersion,
      fileSizeBytes: pdfBytes.length,
      pageCount,
      revisionCount,
      totalIndirectObjects,
      isEncrypted,
      producer,
      creator,
      creationDate,
      modDate,
    },
    security: {
      hasJavaScript,
      hasLaunchActions,
      hasEmbeddedFiles,
      hasAcroForm,
      hasSignatures,
      isEncrypted,
      warnings,
    },
    fonts: Array.from(fontMap.values()),
    images,
    objectTypeCounts,
    page1RawStreamSample,
  };
}
