import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import { MAX_FILE_SIZE_BYTES } from './merge';

export type PageNumberPosition =
  | 'bottom-center'
  | 'bottom-right'
  | 'bottom-left'
  | 'top-center'
  | 'top-right'
  | 'top-left';

export type PageNumberFormat =
  | 'page-n-of-total'
  | 'n-of-total'
  | 'page-n'
  | 'n';

export interface PageNumberOptions {
  position: PageNumberPosition;
  format: PageNumberFormat;
  startFromPage: number; // 1-based page index to begin numbering (e.g., 2 skips cover page)
  firstNumber: number;   // Number displayed on startFromPage (default: 1)
  fontSize?: number;     // Font size in points (default: 11)
  margin?: number;       // Distance from edge in points (default: 30)
}

export interface PageNumberProgress {
  message: string;
  percent: number;
}

export function formatPageText(
  format: PageNumberFormat,
  currentNum: number,
  totalNumberedPages: number
): string {
  switch (format) {
    case 'page-n-of-total':
      return `Page ${currentNum} of ${totalNumberedPages}`;
    case 'n-of-total':
      return `${currentNum} / ${totalNumberedPages}`;
    case 'page-n':
      return `Page ${currentNum}`;
    case 'n':
    default:
      return `${currentNum}`;
  }
}

/**
 * Stamps customizable page numbers onto a PDF document using pdf-lib.
 * 
 * @param file The PDF File object to paginate.
 * @param options Pagination configuration (position, format, start page, etc.)
 * @param onProgress Optional progress callback.
 * @returns Uint8Array of the modified PDF document bytes.
 */
export async function addPageNumbers(
  file: File,
  options: PageNumberOptions,
  onProgress?: (progress: PageNumberProgress) => void
): Promise<Uint8Array> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('File exceeds the 100MB limit.');
  }

  onProgress?.({ message: 'Loading PDF document into memory...', percent: 15 });
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = options.fontSize ?? 11;
  const margin = options.margin ?? 30;
  const textColor = rgb(0.2, 0.2, 0.2);

  const pages = pdfDoc.getPages();
  const totalPages = pages.length;

  if (options.startFromPage > totalPages) {
    throw new Error(`Start page (${options.startFromPage}) exceeds document length (${totalPages} ${totalPages === 1 ? 'page' : 'pages'}).`);
  }

  const startPageIdx = Math.max(1, options.startFromPage) - 1;
  const totalNumberedPages = totalPages - startPageIdx;

  onProgress?.({ message: 'Stamping page numbers...', percent: 45 });

  for (let i = 0; i < totalPages; i++) {
    if (i < startPageIdx) {
      continue; // Skip pages before startFromPage
    }

    const page = pages[i];
    const pageNumDisplay = options.firstNumber + (i - startPageIdx);
    const text = formatPageText(options.format, pageNumDisplay, totalNumberedPages);
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const textHeight = font.heightAtSize(fontSize);

    const { width, height } = page.getSize();
    const rotation = page.getRotation().angle;

    let x = 0;
    let y = 0;

    // Normal (0 degree) or unrotated coordinate calculation
    if (rotation === 0) {
      // Horizontal placement
      if (options.position.includes('left')) {
        x = margin;
      } else if (options.position.includes('right')) {
        x = width - margin - textWidth;
      } else {
        // center
        x = (width - textWidth) / 2;
      }

      // Vertical placement
      if (options.position.includes('top')) {
        y = height - margin - textHeight;
      } else {
        // bottom
        y = margin;
      }

      page.drawText(text, {
        x,
        y,
        size: fontSize,
        font,
        color: textColor,
      });
    } else {
      // For rotated pages, handle coordinates relative to page orientation
      let effWidth = width;
      let effHeight = height;
      if (rotation === 90 || rotation === 270) {
        effWidth = height;
        effHeight = width;
      }

      let effX = 0;
      let effY = 0;
      if (options.position.includes('left')) {
        effX = margin;
      } else if (options.position.includes('right')) {
        effX = effWidth - margin - textWidth;
      } else {
        effX = (effWidth - textWidth) / 2;
      }

      if (options.position.includes('top')) {
        effY = effHeight - margin - textHeight;
      } else {
        effY = margin;
      }

      // Draw with rotation angle matching page rotation
      if (rotation === 90) {
        x = width - effY;
        y = effX;
      } else if (rotation === 180) {
        x = width - effX;
        y = height - effY;
      } else if (rotation === 270) {
        x = effY;
        y = height - effX;
      } else {
        x = effX;
        y = effY;
      }

      page.drawText(text, {
        x,
        y,
        size: fontSize,
        font,
        color: textColor,
        rotate: degrees(rotation),
      });
    }

    const currentProgress = 45 + Math.round(((i + 1) / totalPages) * 40);
    onProgress?.({ message: `Stamping page ${i + 1} of ${totalPages}...`, percent: currentProgress });
  }

  onProgress?.({ message: 'Saving numbered PDF document...', percent: 90 });
  const resultBytes = await pdfDoc.save();

  onProgress?.({ message: 'Page numbering complete!', percent: 100 });
  return resultBytes;
}
