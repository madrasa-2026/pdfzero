import { PDFDocument, PDFName, rgb } from 'pdf-lib';

export type NupLayout = '2-up' | '4-up' | '6-up' | '8-up' | '9-up' | '16-up';
export type SheetSize = 'a4' | 'letter' | 'legal' | 'a3' | 'source';
export type SheetOrientation = 'auto' | 'portrait' | 'landscape';
export type NupOrder = 'horizontal' | 'vertical';

export interface NupOptions {
  layout?: NupLayout;
  sheetSize?: SheetSize;
  orientation?: SheetOrientation;
  order?: NupOrder;
  margin?: number; // outer page margin in points (default: 18)
  spacing?: number; // gutter / spacing between tiles in points (default: 8)
  drawBorders?: boolean; // draw thin border around each tile (default: false)
  drawCutMarks?: boolean; // draw trimmer cut marks at cell boundaries (default: false)
  pageRange?: string; // optional page range filter e.g. "1-10, 12"
}

export interface NupResult {
  pdfBytes: Uint8Array;
  originalSize: number;
  outputSize: number;
  inputPagesProcessed: number;
  sheetsGenerated: number;
  layout: NupLayout;
  pagesPerSheet: number;
}

const STANDARD_SIZES: Record<Exclude<SheetSize, 'source'>, { width: number; height: number }> = {
  a4: { width: 595.28, height: 841.89 },
  letter: { width: 612.0, height: 792.0 },
  legal: { width: 612.0, height: 1008.0 },
  a3: { width: 841.89, height: 1190.55 },
};

/**
 * Returns grid rows and columns based on layout and target orientation.
 */
export function getGridDimensions(
  layout: NupLayout,
  isLandscape: boolean
): { rows: number; cols: number; count: number } {
  switch (layout) {
    case '2-up':
      return isLandscape
        ? { rows: 1, cols: 2, count: 2 }
        : { rows: 2, cols: 1, count: 2 };
    case '4-up':
      return { rows: 2, cols: 2, count: 4 };
    case '6-up':
      return isLandscape
        ? { rows: 2, cols: 3, count: 6 }
        : { rows: 3, cols: 2, count: 6 };
    case '8-up':
      return isLandscape
        ? { rows: 2, cols: 4, count: 8 }
        : { rows: 4, cols: 2, count: 8 };
    case '9-up':
      return { rows: 3, cols: 3, count: 9 };
    case '16-up':
      return { rows: 4, cols: 4, count: 16 };
  }
}

/**
 * Parses user page range string (e.g. "1-5, 8, 10-12") into 0-indexed page indices.
 */
export function parsePageRange(rangeStr: string, totalPages: number): number[] {
  if (!rangeStr || !rangeStr.trim() || rangeStr.trim().toLowerCase() === 'all') {
    return Array.from({ length: totalPages }, (_, i) => i);
  }

  const indices = new Set<number>();
  const parts = rangeStr.split(',');

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    if (trimmed.includes('-')) {
      const [startStr, endStr] = trimmed.split('-');
      const start = parseInt(startStr.trim(), 10);
      const end = parseInt(endStr.trim(), 10);
      if (!isNaN(start) && !isNaN(end)) {
        const from = Math.max(1, Math.min(start, end));
        const to = Math.min(totalPages, Math.max(start, end));
        for (let p = from; p <= to; p++) {
          indices.add(p - 1);
        }
      }
    } else {
      const p = parseInt(trimmed, 10);
      if (!isNaN(p) && p >= 1 && p <= totalPages) {
        indices.add(p - 1);
      }
    }
  }

  return Array.from(indices).sort((a, b) => a - b);
}

/**
 * Calculates scale and position for placing a source page inside a grid cell.
 */
function fitPageInCell(
  cellWidth: number,
  cellHeight: number,
  pageWidth: number,
  pageHeight: number
): { width: number; height: number; scale: number } {
  const scale = Math.min(cellWidth / pageWidth, cellHeight / pageHeight);
  return {
    width: pageWidth * scale,
    height: pageHeight * scale,
    scale,
  };
}

/**
 * Core N-Up Imposition Engine.
 */
export async function imposeNup(
  pdfBytes: Uint8Array,
  options: NupOptions = {}
): Promise<NupResult> {
  const {
    layout = '2-up',
    sheetSize = 'a4',
    orientation = 'auto',
    order = 'horizontal',
    margin = 18,
    spacing = 8,
    drawBorders = false,
    drawCutMarks = false,
    pageRange = 'all',
  } = options;

  const originalSize = pdfBytes.length;
  const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const totalSrcPages = srcDoc.getPageCount();

  if (totalSrcPages === 0) {
    throw new Error('PDF document contains no pages.');
  }

  const selectedIndices = parsePageRange(pageRange, totalSrcPages);
  if (selectedIndices.length === 0) {
    throw new Error('No valid pages found in selected page range.');
  }

  // Base dimensions from the first selected page
  const samplePage = srcDoc.getPage(selectedIndices[0]);
  const { width: srcWidth, height: srcHeight } = samplePage.getSize();

  // Determine base sheet dimensions
  let baseWidth: number;
  let baseHeight: number;

  if (sheetSize === 'source') {
    baseWidth = srcWidth;
    baseHeight = srcHeight;
  } else {
    const std = STANDARD_SIZES[sheetSize] || STANDARD_SIZES.a4;
    baseWidth = std.width;
    baseHeight = std.height;
  }

  // Always normalize base to portrait: width <= height
  const portraitWidth = Math.min(baseWidth, baseHeight);
  const portraitHeight = Math.max(baseWidth, baseHeight);
  const landscapeWidth = portraitHeight;
  const landscapeHeight = portraitWidth;

  let isLandscape: boolean;

  if (orientation === 'landscape') {
    isLandscape = true;
  } else if (orientation === 'portrait') {
    isLandscape = false;
  } else {
    // Auto: test which orientation yields larger page scale
    const landscapeGrid = getGridDimensions(layout, true);
    const portraitGrid = getGridDimensions(layout, false);

    // Calculate scale in landscape
    const landAvailW = Math.max(1, landscapeWidth - 2 * margin - (landscapeGrid.cols - 1) * spacing);
    const landAvailH = Math.max(1, landscapeHeight - 2 * margin - (landscapeGrid.rows - 1) * spacing);
    const landCellW = landAvailW / landscapeGrid.cols;
    const landCellH = landAvailH / landscapeGrid.rows;
    const landScale = Math.min(landCellW / srcWidth, landCellH / srcHeight);

    // Calculate scale in portrait
    const portAvailW = Math.max(1, portraitWidth - 2 * margin - (portraitGrid.cols - 1) * spacing);
    const portAvailH = Math.max(1, portraitHeight - 2 * margin - (portraitGrid.rows - 1) * spacing);
    const portCellW = portAvailW / portraitGrid.cols;
    const portCellH = portAvailH / portraitGrid.rows;
    const portScale = Math.min(portCellW / srcWidth, portCellH / srcHeight);

    isLandscape = landScale >= portScale;
  }

  const sheetWidth = isLandscape ? landscapeWidth : portraitWidth;
  const sheetHeight = isLandscape ? landscapeHeight : portraitHeight;
  const { rows, cols, count: pagesPerSheet } = getGridDimensions(layout, isLandscape);

  // Calculate cell dimensions
  const availWidth = Math.max(1, sheetWidth - 2 * margin - (cols - 1) * spacing);
  const availHeight = Math.max(1, sheetHeight - 2 * margin - (rows - 1) * spacing);
  const cellWidth = availWidth / cols;
  const cellHeight = availHeight / rows;

  // Ensure all pages have valid Contents streams so blank pages embed without error
  for (const page of srcDoc.getPages()) {
    if (!page.node.Contents()) {
      page.node.set(PDFName.of('Contents'), srcDoc.context.stream(''));
    }
  }

  // Create destination PDF document
  const destDoc = await PDFDocument.create();
  const embeddedPages = await destDoc.embedPdf(srcDoc, selectedIndices);

  const numSheets = Math.ceil(selectedIndices.length / pagesPerSheet);

  for (let s = 0; s < numSheets; s++) {
    const sheet = destDoc.addPage([sheetWidth, sheetHeight]);

    for (let slot = 0; slot < pagesPerSheet; slot++) {
      const pageIndexInBatch = s * pagesPerSheet + slot;
      if (pageIndexInBatch >= embeddedPages.length) break;

      const embedded = embeddedPages[pageIndexInBatch];
      const origPage = srcDoc.getPage(selectedIndices[pageIndexInBatch]);
      const { width: pW, height: pH } = origPage.getSize();

      // Determine row and col based on order
      let r: number;
      let c: number;

      if (order === 'horizontal') {
        // Left to right, top to bottom
        r = Math.floor(slot / cols);
        c = slot % cols;
      } else {
        // Top to bottom, left to right
        c = Math.floor(slot / rows);
        r = slot % rows;
      }

      // Cell bounds in PDF bottom-left coordinate space
      const cellLeft = margin + c * (cellWidth + spacing);
      // Row 0 is top row, so its bottom Y is sheetHeight - margin - (r + 1) * cellHeight - r * spacing
      const cellBottom = sheetHeight - margin - (r + 1) * cellHeight - r * spacing;

      // Fit page inside this cell
      const fit = fitPageInCell(cellWidth, cellHeight, pW, pH);
      const drawX = cellLeft + (cellWidth - fit.width) / 2;
      const drawY = cellBottom + (cellHeight - fit.height) / 2;

      // Draw embedded page Form XObject (preserves crisp vector quality)
      sheet.drawPage(embedded, {
        x: drawX,
        y: drawY,
        width: fit.width,
        height: fit.height,
      });

      // Optional: Draw neat tile border
      if (drawBorders) {
        sheet.drawRectangle({
          x: drawX,
          y: drawY,
          width: fit.width,
          height: fit.height,
          borderWidth: 0.5,
          borderColor: rgb(0.75, 0.78, 0.82),
          opacity: 0,
          borderOpacity: 0.8,
        });
      }

      // Optional: Draw trimmer cut marks at cell outer boundaries
      if (drawCutMarks) {
        const markLen = 6;
        const markColor = rgb(0.5, 0.5, 0.5);

        // Top-Left corner tick marks
        sheet.drawLine({
          start: { x: cellLeft - markLen, y: cellBottom + cellHeight },
          end: { x: cellLeft, y: cellBottom + cellHeight },
          thickness: 0.5,
          color: markColor,
        });
        sheet.drawLine({
          start: { x: cellLeft, y: cellBottom + cellHeight },
          end: { x: cellLeft, y: cellBottom + cellHeight + markLen },
          thickness: 0.5,
          color: markColor,
        });

        // Top-Right corner tick marks
        sheet.drawLine({
          start: { x: cellLeft + cellWidth, y: cellBottom + cellHeight },
          end: { x: cellLeft + cellWidth + markLen, y: cellBottom + cellHeight },
          thickness: 0.5,
          color: markColor,
        });
        sheet.drawLine({
          start: { x: cellLeft + cellWidth, y: cellBottom + cellHeight },
          end: { x: cellLeft + cellWidth, y: cellBottom + cellHeight + markLen },
          thickness: 0.5,
          color: markColor,
        });

        // Bottom-Left corner tick marks
        sheet.drawLine({
          start: { x: cellLeft - markLen, y: cellBottom },
          end: { x: cellLeft, y: cellBottom },
          thickness: 0.5,
          color: markColor,
        });
        sheet.drawLine({
          start: { x: cellLeft, y: cellBottom - markLen },
          end: { x: cellLeft, y: cellBottom },
          thickness: 0.5,
          color: markColor,
        });

        // Bottom-Right corner tick marks
        sheet.drawLine({
          start: { x: cellLeft + cellWidth, y: cellBottom },
          end: { x: cellLeft + cellWidth + markLen, y: cellBottom },
          thickness: 0.5,
          color: markColor,
        });
        sheet.drawLine({
          start: { x: cellLeft + cellWidth, y: cellBottom - markLen },
          end: { x: cellLeft + cellWidth, y: cellBottom },
          thickness: 0.5,
          color: markColor,
        });
      }
    }
  }

  const outputBytes = await destDoc.save({ useObjectStreams: false });

  return {
    pdfBytes: outputBytes,
    originalSize,
    outputSize: outputBytes.length,
    inputPagesProcessed: selectedIndices.length,
    sheetsGenerated: numSheets,
    layout,
    pagesPerSheet,
  };
}
