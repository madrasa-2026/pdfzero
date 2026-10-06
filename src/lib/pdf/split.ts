import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { MAX_FILE_SIZE_BYTES } from './merge';

export interface SplitProgress {
  message: string;
  percent: number;
}

/**
 * Parses user-entered page ranges like "1-3, 5, 7-9" into an ordered list of 1-based page numbers.
 */
export function parsePageRanges(rangeStr: string, maxPages: number): number[] {
  if (!rangeStr || !rangeStr.trim()) {
    throw new Error('Please enter at least one page number or range (e.g. 1-3, 5).');
  }

  const parts = rangeStr.split(',').map((p) => p.trim()).filter(Boolean);
  const pagesSet = new Set<number>();
  const orderedPages: number[] = [];

  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-').map((s) => s.trim());
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);

      if (isNaN(start) || isNaN(end) || start < 1 || end < start) {
        throw new Error(`Invalid page range "${part}". Start page must be 1 or higher, and end must be greater than start.`);
      }

      for (let p = start; p <= Math.min(end, maxPages); p++) {
        if (!pagesSet.has(p)) {
          pagesSet.add(p);
          orderedPages.push(p);
        }
      }
    } else {
      const page = parseInt(part, 10);
      if (isNaN(page) || page < 1) {
        throw new Error(`Invalid page number "${part}".`);
      }
      if (page > maxPages) {
        throw new Error(`Page ${page} exceeds the document maximum of ${maxPages} pages.`);
      }
      if (!pagesSet.has(page)) {
        pagesSet.add(page);
        orderedPages.push(page);
      }
    }
  }

  if (orderedPages.length === 0) {
    throw new Error('No valid pages found in the specified range.');
  }

  return orderedPages;
}

/**
 * Inspects a PDF file and returns its total page count.
 */
export async function getPdfPageCount(file: File): Promise<number> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  return pdf.getPageCount();
}

/**
 * Extracts a specific subset or range of pages into a single new PDF document.
 */
export async function extractPageRange(
  file: File,
  pages1Based: number[],
  onProgress?: (progress: SplitProgress) => void
): Promise<Uint8Array> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File exceeds the 100MB limit.`);
  }

  onProgress?.({ message: 'Loading PDF document...', percent: 15 });
  const arrayBuffer = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(arrayBuffer);

  const totalDocPages = sourcePdf.getPageCount();
  const indicesToCopy = pages1Based
    .filter((p) => p >= 1 && p <= totalDocPages)
    .map((p) => p - 1); // 0-based indices for pdf-lib

  if (indicesToCopy.length === 0) {
    throw new Error('No valid pages selected for extraction.');
  }

  onProgress?.({ message: `Extracting ${indicesToCopy.length} pages...`, percent: 45 });
  const newPdf = await PDFDocument.create();
  const copiedPages = await newPdf.copyPages(sourcePdf, indicesToCopy);

  for (const page of copiedPages) {
    newPdf.addPage(page);
  }

  onProgress?.({ message: 'Finalizing extracted PDF...', percent: 85 });
  const resultBytes = await newPdf.save();
  onProgress?.({ message: 'Done!', percent: 100 });

  return resultBytes;
}

/**
 * Splits every page in the PDF into an individual standalone PDF file and bundles them into a ZIP archive.
 */
export async function splitAllPagesToZip(
  file: File,
  onProgress?: (progress: SplitProgress) => void
): Promise<Uint8Array> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File exceeds the 100MB limit.`);
  }

  onProgress?.({ message: 'Loading PDF document...', percent: 10 });
  const arrayBuffer = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(arrayBuffer);
  const numPages = sourcePdf.getPageCount();

  const zip = new JSZip();
  const baseName = file.name.replace(/\.[^/.]+$/, '');

  for (let i = 0; i < numPages; i++) {
    const pageNum = i + 1;
    onProgress?.({
      message: `Extracting page ${pageNum} of ${numPages}...`,
      percent: 10 + Math.floor((i / numPages) * 70),
    });

    const singleDoc = await PDFDocument.create();
    const [copiedPage] = await singleDoc.copyPages(sourcePdf, [i]);
    singleDoc.addPage(copiedPage);

    const singleBytes = await singleDoc.save();
    const paddedNum = String(pageNum).padStart(3, '0');
    zip.file(`${baseName}-page-${paddedNum}.pdf`, singleBytes);
  }

  onProgress?.({ message: 'Compressing pages into ZIP archive...', percent: 85 });
  const zipBytes = await zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  onProgress?.({ message: 'ZIP archive ready!', percent: 100 });
  return zipBytes;
}
