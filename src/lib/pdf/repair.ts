import { PDFDocument } from 'pdf-lib-with-encrypt';

export interface RepairReport {
  repairedBytes: Uint8Array;
  originalSize: number;
  repairedSize: number;
  pagesRecovered: number;
  fixesApplied: string[];
  isFullyRestored: boolean;
}

/**
 * Searches for the standard %PDF- magic signature and strips any leading junk bytes.
 */
export function sanitizePdfHeader(bytes: Uint8Array): { bytes: Uint8Array; fixed: boolean } {
  // %PDF- in ASCII is [0x25, 0x50, 0x44, 0x46, 0x2D]
  const magic = [0x25, 0x50, 0x44, 0x46, 0x2d];
  let offset = -1;

  for (let i = 0; i < Math.min(bytes.length - 4, 8192); i++) {
    if (
      bytes[i] === magic[0] &&
      bytes[i + 1] === magic[1] &&
      bytes[i + 2] === magic[2] &&
      bytes[i + 3] === magic[3] &&
      bytes[i + 4] === magic[4]
    ) {
      offset = i;
      break;
    }
  }

  if (offset > 0) {
    return {
      bytes: bytes.subarray(offset),
      fixed: true,
    };
  }

  if (offset === -1) {
    // If %PDF- header is completely missing, prepend standard PDF 1.7 header
    const header = new TextEncoder().encode('%PDF-1.7\n%\xFF\xFF\xFF\xFF\n');
    const combined = new Uint8Array(header.length + bytes.length);
    combined.set(header, 0);
    combined.set(bytes, header.length);
    return {
      bytes: combined,
      fixed: true,
    };
  }

  return { bytes, fixed: false };
}

/**
 * Verifies that the PDF buffer ends with a valid %%EOF marker and trailer.
 * If truncated, synthesizes a valid trailer and %%EOF.
 */
export function repairMissingEof(bytes: Uint8Array): { bytes: Uint8Array; fixed: boolean } {
  const tailLength = Math.min(bytes.length, 2048);
  const tailBytes = bytes.subarray(bytes.length - tailLength);
  const tailText = new TextDecoder('latin1').decode(tailBytes);

  if (tailText.includes('%%EOF')) {
    return { bytes, fixed: false };
  }

  // Find root catalog reference if available in buffer
  const fullText = new TextDecoder('latin1').decode(bytes.subarray(0, Math.min(bytes.length, 65536)));
  const catalogMatch = fullText.match(/\/Type\s*\/Catalog/);
  let rootRef = '1 0 R';

  if (catalogMatch && catalogMatch.index) {
    // Scan backward from /Type /Catalog to find object number
    const beforeCatalog = fullText.slice(Math.max(0, catalogMatch.index - 80), catalogMatch.index);
    const objMatch = beforeCatalog.match(/(\d+)\s+(\d+)\s+obj/g);
    if (objMatch && objMatch.length > 0) {
      const lastObj = objMatch[objMatch.length - 1];
      const parts = lastObj.split(/\s+/);
      if (parts[0]) {
        rootRef = `${parts[0]} 0 R`;
      }
    }
  }

  const syntheticTail = `\ntrailer\n<< /Size 1000 /Root ${rootRef} >>\nstartxref\n0\n%%EOF\n`;
  const tailEncoded = new TextEncoder().encode(syntheticTail);

  const repaired = new Uint8Array(bytes.length + tailEncoded.length);
  repaired.set(bytes, 0);
  repaired.set(tailEncoded, bytes.length);

  return {
    bytes: repaired,
    fixed: true,
  };
}

/**
 * Rebuilds the cross-reference (xref) table from raw object offsets in the byte stream.
 */
export function rebuildXrefTable(bytes: Uint8Array): { bytes: Uint8Array; fixed: boolean } {
  const text = new TextDecoder('latin1').decode(bytes);
  const objRegex = /(\d+)\s+(\d+)\s+obj\b/g;

  const objects: { num: number; gen: number; offset: number }[] = [];
  let match: RegExpExecArray | null;

  while ((match = objRegex.exec(text)) !== null) {
    const num = parseInt(match[1], 10);
    const gen = parseInt(match[2], 10);
    objects.push({ num, gen, offset: match.index });
  }

  if (objects.length === 0) {
    return { bytes, fixed: false };
  }

  // Sort by object number
  objects.sort((a, b) => a.num - b.num);
  const maxNum = objects[objects.length - 1].num;

  // Build standard ASCII xref table
  let xrefStr = `\nxref\n0 ${maxNum + 1}\n0000000000 65535 f \r\n`;
  const objMap = new Map(objects.map((o) => [o.num, o.offset]));

  for (let i = 1; i <= maxNum; i++) {
    const offset = objMap.get(i);
    if (offset !== undefined) {
      const offsetPadded = String(offset).padStart(10, '0');
      xrefStr += `${offsetPadded} 00000 n \r\n`;
    } else {
      xrefStr += `0000000000 00000 f \r\n`;
    }
  }

  const xrefOffset = bytes.length;
  const trailerMatch = text.match(/trailer\s*<<[\s\S]*?>>/);
  const trailerBlock = trailerMatch
    ? trailerMatch[0]
    : `trailer\n<< /Size ${maxNum + 1} /Root 1 0 R >>`;

  const footer = `${xrefStr}${trailerBlock}\nstartxref\n${xrefOffset}\n%%EOF\n`;
  const footerBytes = new TextEncoder().encode(footer);

  const combined = new Uint8Array(bytes.length + footerBytes.length);
  combined.set(bytes, 0);
  combined.set(footerBytes, bytes.length);

  return {
    bytes: combined,
    fixed: true,
  };
}

/**
 * Repairs a PDF byte array by applying header sanitization, EOF restoration,
 * and page-by-page transfusion into a clean document container.
 */
export async function repairPdfBuffer(
  rawBytes: Uint8Array,
  fileName = 'document.pdf',
  onProgress?: (progress: { message: string; percent: number }) => void
): Promise<RepairReport> {
  const originalSize = rawBytes.length;
  const fixesApplied: string[] = [];

  onProgress?.({ message: 'Analyzing binary stream and sanitizing headers...', percent: 20 });
  let workingBytes = rawBytes;

  // 1. Header Sanitization
  const headerCheck = sanitizePdfHeader(workingBytes);
  if (headerCheck.fixed) {
    workingBytes = headerCheck.bytes;
    fixesApplied.push('Normalized PDF header and stripped invalid prefix data');
  }

  // 2. Missing EOF / Trailer Repair
  const eofCheck = repairMissingEof(workingBytes);
  if (eofCheck.fixed) {
    workingBytes = eofCheck.bytes;
    fixesApplied.push('Reconstructed missing trailer dictionary and %%EOF marker');
  }

  onProgress?.({ message: 'Scanning objects and salvaging intact pages...', percent: 50 });

  let sourceDoc: PDFDocument | null = null;
  try {
    sourceDoc = await PDFDocument.load(workingBytes, {
      ignoreEncryption: true,
      parseSpeed: 1000,
    });
  } catch {
    // If standard load fails, rebuild xref table
    const xrefCheck = rebuildXrefTable(workingBytes);
    if (xrefCheck.fixed) {
      workingBytes = xrefCheck.bytes;
      fixesApplied.push('Rebuilt damaged cross-reference (xref) table from raw object offsets');
    }

    try {
      sourceDoc = await PDFDocument.load(workingBytes, { ignoreEncryption: true });
    } catch (err: any) {
      throw new Error(`Unable to salvage PDF content: ${err?.message || 'File structure is unreadable'}`);
    }
  }

  onProgress?.({ message: 'Assembling clean, standards-compliant PDF...', percent: 80 });

  // 3. Page-by-page Transfusion
  const cleanDoc = await PDFDocument.create();
  const pageCount = sourceDoc.getPageCount();
  let recoveredCount = 0;

  for (let i = 0; i < pageCount; i++) {
    try {
      const [copiedPage] = await cleanDoc.copyPages(sourceDoc, [i]);
      cleanDoc.addPage(copiedPage);
      recoveredCount++;
    } catch {
      fixesApplied.push(`Skipped corrupted page stream at index ${i + 1}`);
    }
  }

  if (recoveredCount === 0) {
    throw new Error('No salvageable pages found in the document.');
  }

  // Copy document metadata if present
  try {
    const title = sourceDoc.getTitle();
    if (title) cleanDoc.setTitle(title);
  } catch {}

  const repairedBytes = await cleanDoc.save({ useObjectStreams: false });

  onProgress?.({ message: 'PDF successfully repaired and restored!', percent: 100 });

  return {
    repairedBytes,
    originalSize,
    repairedSize: repairedBytes.length,
    pagesRecovered: recoveredCount,
    fixesApplied: fixesApplied.length > 0 ? fixesApplied : ['Rebuilt document container and normalized structure'],
    isFullyRestored: recoveredCount === pageCount,
  };
}

/**
 * Public entrypoint for browser File objects.
 */
export async function repairPdf(
  file: File,
  onProgress?: (progress: { message: string; percent: number }) => void
): Promise<RepairReport> {
  const arrayBuffer = await file.arrayBuffer();
  return repairPdfBuffer(new Uint8Array(arrayBuffer), file.name, onProgress);
}
