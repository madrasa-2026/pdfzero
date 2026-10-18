import {
  PDFDocument,
  rgb,
} from 'pdf-lib';

export type BookletMode = 'booklet' | '2-up' | '4-up';
export type BindingDirection = 'ltr' | 'rtl';

export interface BookletOptions {
  mode?: BookletMode;
  binding?: BindingDirection;
  gutter?: number; // point gap in center (e.g. 0, 12, 24)
  drawFoldLine?: boolean;
}

export interface SheetPair {
  sheetIndex: number;
  side: 'front' | 'back' | 'single';
  leftPage: number | null; // 1-based, or null for blank
  rightPage: number | null; // 1-based, or null for blank
}

export interface BookletResult {
  imposedBytes: Uint8Array;
  originalSize: number;
  outputSize: number;
  originalPageCount: number;
  paddedPageCount: number;
  sheetsGenerated: number;
  sheetPairs: SheetPair[];
}

/**
 * Calculates saddle-stitch imposition order for N pages (padded to multiple of 4).
 */
export function calculateSaddleStitchOrder(
  pageCount: number,
  binding: BindingDirection = 'ltr'
): { pairs: SheetPair[]; paddedCount: number } {
  const paddedCount = Math.ceil(Math.max(1, pageCount) / 4) * 4;
  const numSheets = paddedCount / 4;
  const pairs: SheetPair[] = [];

  for (let k = 0; k < numSheets; k++) {
    // Front side (odd sheet side)
    let left1 = paddedCount - 2 * k;
    let right1 = 2 * k + 1;

    // Back side (even sheet side)
    let left2 = 2 * k + 2;
    let right2 = paddedCount - 2 * k - 1;

    if (binding === 'rtl') {
      [left1, right1] = [right1, left1];
      [left2, right2] = [right2, left2];
    }

    pairs.push({
      sheetIndex: k + 1,
      side: 'front',
      leftPage: left1 <= pageCount ? left1 : null,
      rightPage: right1 <= pageCount ? right1 : null,
    });

    pairs.push({
      sheetIndex: k + 1,
      side: 'back',
      leftPage: left2 <= pageCount ? left2 : null,
      rightPage: right2 <= pageCount ? right2 : null,
    });
  }

  return { pairs, paddedCount };
}

/**
 * Calculates sequential 2-Up handout pairs.
 */
export function calculate2UpOrder(
  pageCount: number,
  binding: BindingDirection = 'ltr'
): { pairs: SheetPair[]; paddedCount: number } {
  const paddedCount = Math.ceil(Math.max(1, pageCount) / 2) * 2;
  const pairs: SheetPair[] = [];

  for (let i = 0; i < paddedCount; i += 2) {
    let left = i + 1;
    let right = i + 2;

    if (binding === 'rtl') {
      [left, right] = [right, left];
    }

    pairs.push({
      sheetIndex: Math.floor(i / 2) + 1,
      side: 'single',
      leftPage: left <= pageCount ? left : null,
      rightPage: right <= pageCount ? right : null,
    });
  }

  return { pairs, paddedCount };
}

/**
 * Master Imposition function: Creates a booklet or N-up PDF with embedded vector pages.
 */
export async function createBookletPdf(
  inputBytes: Uint8Array,
  options: BookletOptions = {}
): Promise<BookletResult> {
  const originalSize = inputBytes.length;
  const srcDoc = await PDFDocument.load(inputBytes, { ignoreEncryption: true });
  const originalPageCount = srcDoc.getPageCount();

  const mode = options.mode || 'booklet';
  const binding = options.binding || 'ltr';
  const gutter = Math.max(0, options.gutter ?? 0);
  const drawFoldLine = options.drawFoldLine ?? true;

  if (originalPageCount === 0) {
    throw new Error('PDF document contains no pages.');
  }

  // Determine standard page dimensions from first page
  const firstPage = srcDoc.getPage(0);
  const { width: pWidth, height: pHeight } = firstPage.getSize();

  const destDoc = await PDFDocument.create();

  // Copy/embed all pages from source document
  const embeddedPages = await destDoc.embedPdf(srcDoc, srcDoc.getPageIndices());

  let sheetPairs: SheetPair[] = [];
  let paddedCount = originalPageCount;

  if (mode === 'booklet') {
    const calculated = calculateSaddleStitchOrder(originalPageCount, binding);
    sheetPairs = calculated.pairs;
    paddedCount = calculated.paddedCount;
  } else if (mode === '2-up') {
    const calculated = calculate2UpOrder(originalPageCount, binding);
    sheetPairs = calculated.pairs;
    paddedCount = calculated.paddedCount;
  } else {
    // 4-Up: 4 pages arranged in 2x2 grid per landscape sheet
    const pagesPerSheet = 4;
    const numSheets = Math.ceil(originalPageCount / pagesPerSheet);
    paddedCount = numSheets * pagesPerSheet;

    const sheetWidth = pWidth * 2;
    const sheetHeight = pHeight * 2;

    for (let s = 0; s < numSheets; s++) {
      const sheet = destDoc.addPage([sheetWidth, sheetHeight]);

      for (let pos = 0; pos < 4; pos++) {
        const pageIdx = s * 4 + pos;
        if (pageIdx < originalPageCount) {
          const emb = embeddedPages[pageIdx];
          const col = pos % 2;
          const row = Math.floor(pos / 2); // 0 = top, 1 = bottom
          const x = col * pWidth;
          const y = (1 - row) * pHeight;

          sheet.drawPage(emb, {
            x,
            y,
            width: pWidth,
            height: pHeight,
          });
        }
      }

      if (drawFoldLine) {
        // Center cross divider lines
        sheet.drawLine({
          start: { x: pWidth, y: 0 },
          end: { x: pWidth, y: sheetHeight },
          thickness: 0.5,
          color: rgb(0.75, 0.75, 0.75),
          opacity: 0.4,
        });
        sheet.drawLine({
          start: { x: 0, y: pHeight },
          end: { x: sheetWidth, y: pHeight },
          thickness: 0.5,
          color: rgb(0.75, 0.75, 0.75),
          opacity: 0.4,
        });
      }
    }

    const outputBytes = await destDoc.save({ useObjectStreams: false });
    return {
      imposedBytes: outputBytes,
      originalSize,
      outputSize: outputBytes.length,
      originalPageCount,
      paddedPageCount: paddedCount,
      sheetsGenerated: numSheets,
      sheetPairs: [],
    };
  }

  // 2-Up Landscape Sheet: width = 2 * pWidth + gutter, height = pHeight
  const sheetWidth = pWidth * 2 + gutter;
  const sheetHeight = pHeight;

  for (const pair of sheetPairs) {
    const sheet = destDoc.addPage([sheetWidth, sheetHeight]);

    // Draw Left Page
    if (pair.leftPage !== null && pair.leftPage >= 1 && pair.leftPage <= originalPageCount) {
      const embLeft = embeddedPages[pair.leftPage - 1];
      sheet.drawPage(embLeft, {
        x: 0,
        y: 0,
        width: pWidth,
        height: pHeight,
      });
    }

    // Draw Right Page
    if (pair.rightPage !== null && pair.rightPage >= 1 && pair.rightPage <= originalPageCount) {
      const embRight = embeddedPages[pair.rightPage - 1];
      sheet.drawPage(embRight, {
        x: pWidth + gutter,
        y: 0,
        width: pWidth,
        height: pHeight,
      });
    }

    // Draw faint center fold crease line if enabled
    if (drawFoldLine) {
      const centerX = pWidth + gutter / 2;
      sheet.drawLine({
        start: { x: centerX, y: 0 },
        end: { x: centerX, y: sheetHeight },
        thickness: 0.5,
        color: rgb(0.75, 0.75, 0.75),
        opacity: 0.35,
        dashArray: [4, 4],
      });
    }
  }

  const outputBytes = await destDoc.save({ useObjectStreams: false });

  return {
    imposedBytes: outputBytes,
    originalSize,
    outputSize: outputBytes.length,
    originalPageCount,
    paddedPageCount: paddedCount,
    sheetsGenerated: sheetPairs.length,
    sheetPairs,
  };
}
