import { PDFDocument, PDFName } from 'pdf-lib';

export type SplitDirection = 'vertical' | 'horizontal';
export type ReadingDirection = 'ltr' | 'rtl';
export type CoverHandling = 'all' | 'skip-first' | 'skip-first-and-last';

export interface SpreadSplitOptions {
  direction?: SplitDirection;
  readingOrder?: ReadingDirection;
  coverHandling?: CoverHandling;
  spineGutter?: number; // width in points to strip from center binding seam (default: 0)
  splitRatio?: number; // split line position as fraction from 0.1 to 0.9 (default: 0.5)
  onlyLandscape?: boolean; // only split pages that are wider than tall (default: true)
}

export interface SpreadSplitResult {
  pdfBytes: Uint8Array;
  originalSize: number;
  outputSize: number;
  inputPagesCount: number;
  outputPagesCount: number;
  spreadsSplitCount: number;
}

/**
 * Splits two-page book spreads into individual, sequential pages.
 */
export async function splitSpreadPdf(
  pdfBytes: Uint8Array,
  options: SpreadSplitOptions = {}
): Promise<SpreadSplitResult> {
  const {
    direction = 'vertical',
    readingOrder = 'ltr',
    coverHandling = 'all',
    spineGutter = 0,
    splitRatio = 0.5,
    onlyLandscape = true,
  } = options;

  const originalSize = pdfBytes.length;
  const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const totalInputPages = srcDoc.getPageCount();

  if (totalInputPages === 0) {
    throw new Error('PDF document contains no pages to split.');
  }

  // Ensure all pages have valid Contents streams to prevent pdf-lib crash on blank pages
  for (const page of srcDoc.getPages()) {
    if (!page.node.Contents()) {
      page.node.set(PDFName.of('Contents'), srcDoc.context.stream(''));
    }
  }

  const destDoc = await PDFDocument.create();
  const pageIndices = srcDoc.getPageIndices();
  const embeddedPages = await destDoc.embedPdf(srcDoc, pageIndices);

  let spreadsSplitCount = 0;

  for (let i = 0; i < totalInputPages; i++) {
    const isFirstPage = i === 0;
    const isLastPage = i === totalInputPages - 1;

    let shouldPreserveAsSingle = false;
    if (coverHandling === 'skip-first' && isFirstPage) {
      shouldPreserveAsSingle = true;
    } else if (coverHandling === 'skip-first-and-last' && (isFirstPage || isLastPage)) {
      shouldPreserveAsSingle = true;
    }

    const origPage = srcDoc.getPage(i);
    const { width: origW, height: origH } = origPage.getSize();
    const emb = embeddedPages[i];

    const isLandscape = origW > origH;
    const isPortrait = origH > origW;

    // Check onlyLandscape condition (for vertical split, we expect landscape spreads)
    if (direction === 'vertical' && onlyLandscape && !isLandscape) {
      shouldPreserveAsSingle = true;
    } else if (direction === 'horizontal' && onlyLandscape && !isPortrait) {
      shouldPreserveAsSingle = true;
    }

    if (shouldPreserveAsSingle) {
      // Emit untouched single page
      const singleSheet = destDoc.addPage([origW, origH]);
      singleSheet.drawPage(emb, {
        x: 0,
        y: 0,
        width: origW,
        height: origH,
      });
      continue;
    }

    // Perform Spread Split
    spreadsSplitCount++;
    const halfGutter = Math.max(0, spineGutter / 2);

    if (direction === 'vertical') {
      const splitX = origW * Math.max(0.1, Math.min(0.9, splitRatio));
      const leftW = Math.max(10, splitX - halfGutter);
      const rightW = Math.max(10, origW - (splitX + halfGutter));

      const createLeftPage = () => {
        const sheetL = destDoc.addPage([leftW, origH]);
        sheetL.drawPage(emb, {
          x: 0,
          y: 0,
          width: origW,
          height: origH,
        });
      };

      const createRightPage = () => {
        const sheetR = destDoc.addPage([rightW, origH]);
        sheetR.drawPage(emb, {
          x: -(splitX + halfGutter),
          y: 0,
          width: origW,
          height: origH,
        });
      };

      if (readingOrder === 'rtl') {
        // Japanese Manga / Arabic / Hebrew: Right page first, then Left page
        createRightPage();
        createLeftPage();
      } else {
        // Western / Standard: Left page first, then Right page
        createLeftPage();
        createRightPage();
      }
    } else {
      // Horizontal Split (Top / Bottom)
      const splitY = origH * Math.max(0.1, Math.min(0.9, splitRatio));
      const bottomH = Math.max(10, splitY - halfGutter);
      const topH = Math.max(10, origH - (splitY + halfGutter));

      // Top subpage
      const sheetTop = destDoc.addPage([origW, topH]);
      sheetTop.drawPage(emb, {
        x: 0,
        y: -(splitY + halfGutter),
        width: origW,
        height: origH,
      });

      // Bottom subpage
      const sheetBottom = destDoc.addPage([origW, bottomH]);
      sheetBottom.drawPage(emb, {
        x: 0,
        y: 0,
        width: origW,
        height: origH,
      });
    }
  }

  const outputBytes = await destDoc.save({ useObjectStreams: false });
  const outputPagesCount = destDoc.getPageCount();

  return {
    pdfBytes: outputBytes,
    originalSize,
    outputSize: outputBytes.length,
    inputPagesCount: totalInputPages,
    outputPagesCount,
    spreadsSplitCount,
  };
}
