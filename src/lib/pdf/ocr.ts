import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export interface OcrTextBlock {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  confidence?: number;
}

export interface OcrPageResult {
  pageIndex: number;
  blocks: OcrTextBlock[];
  fullText: string;
}

export interface OcrProcessResult {
  searchablePdfBytes: Uint8Array;
  extractedFullText: string;
  pageResults: OcrPageResult[];
  totalWords: number;
  pagesProcessed: number;
}

/**
 * Aggregates plain text from multiple OCR page results into a single clean readable document.
 */
export function aggregateOcrText(pageResults: OcrPageResult[]): string {
  if (!pageResults || pageResults.length === 0) return '';

  return pageResults
    .map((res) => {
      const header = `--- Page ${res.pageIndex + 1} ---`;
      const content = res.fullText.trim();
      return `${header}\n${content}`;
    })
    .join('\n\n');
}

/**
 * Sanitizes a string for WinAnsi encoding compatibility in standard PDF fonts.
 */
function sanitizeForStandardFont(text: string): string {
  return text.replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ');
}

/**
 * Injects an invisible, selectable, and searchable text layer directly over
 * scanned PDF pages aligned with recognition bounding boxes.
 */
export async function injectSearchableTextLayer(
  doc: PDFDocument,
  pageResults: OcrPageResult[]
): Promise<void> {
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const totalPages = doc.getPageCount();

  for (const pageRes of pageResults) {
    if (pageRes.pageIndex < 0 || pageRes.pageIndex >= totalPages) continue;

    const page = doc.getPage(pageRes.pageIndex);
    const pageHeight = page.getHeight();

    for (const block of pageRes.blocks) {
      if (!block.text || block.text.trim().length === 0) continue;

      const safeText = sanitizeForStandardFont(block.text.trim());
      if (safeText.length === 0) continue;

      const fontSize = Math.max(6, Math.min(36, block.fontSize || 12));
      // Clamp coordinates within page boundaries
      const clampedX = Math.max(0, block.x);
      const clampedY = Math.max(0, Math.min(pageHeight, block.y));

      try {
        page.drawText(safeText, {
          x: clampedX,
          y: clampedY,
          size: fontSize,
          font,
          opacity: 0, // Invisible overlay - retains selectability & searchability
        });
      } catch {
        // Fallback for character encoding issues
      }
    }
  }
}

/**
 * Converts a PDF with OCR text blocks into a Searchable PDF document.
 */
export async function createSearchablePdf(
  originalPdfBytes: Uint8Array,
  pageResults: OcrPageResult[]
): Promise<OcrProcessResult> {
  const doc = await PDFDocument.load(originalPdfBytes, { ignoreEncryption: true });
  await injectSearchableTextLayer(doc, pageResults);

  const searchablePdfBytes = await doc.save({ useObjectStreams: false });
  const extractedFullText = aggregateOcrText(pageResults);

  let totalWords = 0;
  for (const p of pageResults) {
    const words = p.fullText.trim().split(/\s+/).filter((w) => w.length > 0);
    totalWords += words.length;
  }

  return {
    searchablePdfBytes,
    extractedFullText,
    pageResults,
    totalWords,
    pagesProcessed: doc.getPageCount(),
  };
}
