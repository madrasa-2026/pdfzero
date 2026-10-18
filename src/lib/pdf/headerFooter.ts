import {
  PDFDocument,
  StandardFonts,
  rgb,
} from 'pdf-lib';

export interface HeaderFooterSlots {
  headerLeft?: string;
  headerCenter?: string;
  headerRight?: string;
  footerLeft?: string;
  footerCenter?: string;
  footerRight?: string;
}

export interface HeaderFooterOptions {
  slots: HeaderFooterSlots;
  fontSize?: number; // default 10 pt
  fontFamily?: 'helvetica' | 'times' | 'courier';
  colorRgb?: [number, number, number]; // default [0.3, 0.35, 0.4]
  marginHorizontal?: number; // default 36 pt (0.5 in)
  marginVertical?: number; // default 30 pt
  skipFirstPage?: boolean; // default false
  alternating?: boolean; // default false
  startPageNumber?: number; // default 1
  filename?: string;
}

export interface HeaderFooterResult {
  stampedBytes: Uint8Array;
  originalSize: number;
  outputSize: number;
  totalPages: number;
  pagesStamped: number;
}

/**
 * Replaces macro tokens with dynamic document values
 */
export function substituteMacros(
  template: string,
  vars: { page: number; total: number; date: string; filename: string }
): string {
  if (!template) return '';
  return template
    .replace(/\{\{\s*page\s*\}\}/gi, String(vars.page))
    .replace(/\{\{\s*total\s*\}\}/gi, String(vars.total))
    .replace(/\{\{\s*date\s*\}\}/gi, vars.date)
    .replace(/\{\{\s*filename\s*\}\}/gi, vars.filename);
}

/**
 * Applies running headers and footers across PDF pages
 */
export async function applyHeaderFooter(
  inputBytes: Uint8Array,
  options: HeaderFooterOptions
): Promise<HeaderFooterResult> {
  const originalSize = inputBytes.length;
  const doc = await PDFDocument.load(inputBytes, { ignoreEncryption: true });
  const totalPages = doc.getPageCount();

  if (totalPages === 0) {
    throw new Error('PDF document contains no pages.');
  }

  const {
    slots,
    fontSize = 10,
    fontFamily = 'helvetica',
    colorRgb = [0.3, 0.35, 0.4],
    marginHorizontal = 36,
    marginVertical = 30,
    skipFirstPage = false,
    alternating = false,
    startPageNumber = 1,
    filename = 'Document',
  } = options;

  let font;
  if (fontFamily === 'times') {
    font = await doc.embedFont(StandardFonts.TimesRoman);
  } else if (fontFamily === 'courier') {
    font = await doc.embedFont(StandardFonts.Courier);
  } else {
    font = await doc.embedFont(StandardFonts.Helvetica);
  }

  const textColor = rgb(colorRgb[0], colorRgb[1], colorRgb[2]);
  const todayStr = new Date().toISOString().split('T')[0];
  const cleanFilename = filename.replace(/\.pdf$/i, '');

  let pagesStamped = 0;

  for (let i = 0; i < totalPages; i++) {
    const pageNum = i + 1;

    // Check cover page exclusion
    if (skipFirstPage && pageNum === 1) {
      continue;
    }

    const page = doc.getPage(i);
    const pageWidth = page.getWidth();
    const pageHeight = page.getHeight();

    const displayPageNum = startPageNumber + (skipFirstPage ? i - 1 : i);
    const macroVars = {
      page: displayPageNum,
      total: skipFirstPage ? totalPages - 1 : totalPages,
      date: todayStr,
      filename: cleanFilename,
    };

    // Determine slot assignments (supporting odd/even alternating page layout)
    let hLeft = slots.headerLeft || '';
    let hCenter = slots.headerCenter || '';
    let hRight = slots.headerRight || '';
    let fLeft = slots.footerLeft || '';
    let fCenter = slots.footerCenter || '';
    let fRight = slots.footerRight || '';

    const isEvenPage = pageNum % 2 === 0;
    if (alternating && isEvenPage) {
      [hLeft, hRight] = [hRight, hLeft];
      [fLeft, fRight] = [fRight, fLeft];
    }

    const headerY = pageHeight - marginVertical - fontSize;
    const footerY = marginVertical;

    // Helper to draw text at an anchor slot
    const drawSlot = (text: string, align: 'left' | 'center' | 'right', y: number) => {
      const rendered = substituteMacros(text, macroVars);
      if (!rendered.trim()) return;

      const textWidth = font.widthOfTextAtSize(rendered, fontSize);
      let x = marginHorizontal;

      if (align === 'center') {
        x = (pageWidth - textWidth) / 2;
      } else if (align === 'right') {
        x = pageWidth - marginHorizontal - textWidth;
      }

      page.drawText(rendered, {
        x,
        y,
        size: fontSize,
        font,
        color: textColor,
      });
    };

    // Draw Headers
    drawSlot(hLeft, 'left', headerY);
    drawSlot(hCenter, 'center', headerY);
    drawSlot(hRight, 'right', headerY);

    // Draw Footers
    drawSlot(fLeft, 'left', footerY);
    drawSlot(fCenter, 'center', footerY);
    drawSlot(fRight, 'right', footerY);

    pagesStamped++;
  }

  const stampedBytes = await doc.save({ useObjectStreams: false });

  return {
    stampedBytes,
    originalSize,
    outputSize: stampedBytes.length,
    totalPages,
    pagesStamped,
  };
}
