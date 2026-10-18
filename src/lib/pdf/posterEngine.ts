import {
  PDFDocument,
  PDFName,
  rgb,
  StandardFonts,
} from 'pdf-lib';

export type PosterPaperSize = 'a4' | 'letter' | 'a3';
export type SheetOrientation = 'portrait' | 'landscape';

export interface PosterOptions {
  columns?: number; // e.g. 2, 3, 4
  rows?: number; // e.g. 2, 3, 4
  paperSize?: PosterPaperSize;
  orientation?: SheetOrientation;
  overlap?: number; // overlap in points (default: 36 pt = 0.5 inch = 12.7 mm)
  showCutLines?: boolean;
  showTileNumbers?: boolean;
  pageIndex?: number; // 0-based index of source page to tile (default: 0)
}

export interface PosterResult {
  pdfBytes: Uint8Array;
  originalSize: number;
  outputSize: number;
  totalSheets: number;
  columns: number;
  rows: number;
  posterDimensionsPt: { width: number; height: number };
  posterDimensionsMm: { width: number; height: number };
  posterDimensionsInches: { width: number; height: number };
}

const PAPER_SIZES: Record<PosterPaperSize, { width: number; height: number }> = {
  a4: { width: 595.28, height: 841.89 },
  letter: { width: 612.0, height: 792.0 },
  a3: { width: 841.89, height: 1190.55 },
};

/**
 * Core PDF Poster Maker & Multi-Sheet Tiler Engine.
 */
export async function tilePosterPdf(
  pdfBytes: Uint8Array,
  options: PosterOptions = {}
): Promise<PosterResult> {
  const {
    columns = 2,
    rows = 2,
    paperSize = 'a4',
    orientation = 'portrait',
    overlap = 36,
    showCutLines = true,
    showTileNumbers = true,
    pageIndex = 0,
  } = options;

  if (columns < 1 || rows < 1) {
    throw new Error('Poster columns and rows must each be at least 1.');
  }

  const originalSize = pdfBytes.length;
  const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();

  if (totalPages === 0) {
    throw new Error('PDF document contains no pages to tile.');
  }

  // Ensure all pages have valid Contents streams to prevent pdf-lib crash on blank pages
  for (const page of srcDoc.getPages()) {
    if (!page.node.Contents()) {
      page.node.set(PDFName.of('Contents'), srcDoc.context.stream(''));
    }
  }

  const targetPageIndex = Math.max(0, Math.min(totalPages - 1, pageIndex));
  const srcPage = srcDoc.getPage(targetPageIndex);
  const { width: pWidth, height: pHeight } = srcPage.getSize();

  // Resolve target single sheet dimensions
  const baseDim = PAPER_SIZES[paperSize] || PAPER_SIZES.a4;
  const isLandscapeSheet = orientation === 'landscape';
  const sheetWidth = isLandscapeSheet
    ? Math.max(baseDim.width, baseDim.height)
    : Math.min(baseDim.width, baseDim.height);
  const sheetHeight = isLandscapeSheet
    ? Math.min(baseDim.width, baseDim.height)
    : Math.max(baseDim.width, baseDim.height);

  // Compute total assembled poster canvas size
  const totalPosterWidth = columns * sheetWidth - (columns - 1) * overlap;
  const totalPosterHeight = rows * sheetHeight - (rows - 1) * overlap;

  // Preserve aspect ratio of source page
  const scale = Math.min(totalPosterWidth / pWidth, totalPosterHeight / pHeight);
  const scaledWidth = pWidth * scale;
  const scaledHeight = pHeight * scale;

  // Center scaled page in assembled poster bounding box
  const offsetX = (totalPosterWidth - scaledWidth) / 2;
  const offsetY = (totalPosterHeight - scaledHeight) / 2;

  // Destination document
  const destDoc = await PDFDocument.create();
  const [embeddedPage] = await destDoc.embedPdf(srcDoc, [targetPageIndex]);
  const font = await destDoc.embedFont(StandardFonts.Helvetica);

  const totalSheets = columns * rows;

  // Iterate rows (0 = top) and columns (0 = left)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      const sheet = destDoc.addPage([sheetWidth, sheetHeight]);

      // Calculate drawing offset in PDF bottom-left coordinate space
      const drawX = offsetX - c * (sheetWidth - overlap);
      const drawY = offsetY - (rows - 1 - r) * (sheetHeight - overlap);

      sheet.drawPage(embeddedPage, {
        x: drawX,
        y: drawY,
        width: scaledWidth,
        height: scaledHeight,
      });

      // Optional assembly trimmer cut lines
      if (showCutLines) {
        const cutColor = rgb(0.65, 0.68, 0.72);

        // Right overlap cut line (if not rightmost column)
        if (c < columns - 1 && overlap > 0) {
          const cutX = sheetWidth - overlap;
          sheet.drawLine({
            start: { x: cutX, y: 0 },
            end: { x: cutX, y: sheetHeight },
            thickness: 0.5,
            color: cutColor,
            dashArray: [4, 4],
          });
        }

        // Bottom overlap cut line (if not bottom row)
        if (r < rows - 1 && overlap > 0) {
          const cutY = overlap;
          sheet.drawLine({
            start: { x: 0, y: cutY },
            end: { x: sheetWidth, y: cutY },
            thickness: 0.5,
            color: cutColor,
            dashArray: [4, 4],
          });
        }
      }

      // Optional assembly numbering badge
      if (showTileNumbers) {
        const labelText = `Tile (${c + 1}, ${r + 1}) of [${columns} × ${rows}]`;
        const textWidth = font.widthOfTextAtSize(labelText, 7);

        sheet.drawRectangle({
          x: 6,
          y: 6,
          width: textWidth + 8,
          height: 12,
          color: rgb(1, 1, 1),
          borderColor: rgb(0.8, 0.8, 0.8),
          borderWidth: 0.5,
          opacity: 0.85,
        });

        sheet.drawText(labelText, {
          x: 10,
          y: 9,
          size: 7,
          font,
          color: rgb(0.3, 0.35, 0.4),
        });
      }
    }
  }

  const outputBytes = await destDoc.save({ useObjectStreams: false });

  // Physical dimension calculations
  const ptToMm = 25.4 / 72;
  const ptToIn = 1 / 72;

  return {
    pdfBytes: outputBytes,
    originalSize,
    outputSize: outputBytes.length,
    totalSheets,
    columns,
    rows,
    posterDimensionsPt: {
      width: Math.round(totalPosterWidth),
      height: Math.round(totalPosterHeight),
    },
    posterDimensionsMm: {
      width: Math.round(totalPosterWidth * ptToMm),
      height: Math.round(totalPosterHeight * ptToMm),
    },
    posterDimensionsInches: {
      width: Number((totalPosterWidth * ptToIn).toFixed(1)),
      height: Number((totalPosterHeight * ptToIn).toFixed(1)),
    },
  };
}
