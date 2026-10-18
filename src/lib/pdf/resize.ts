import { PDFDocument, PDFName } from 'pdf-lib';

export type PaperSizePreset = 'a4' | 'letter' | 'legal' | 'a3' | 'a5' | 'tabloid' | 'custom';
export type ResizeStrategy = 'fit' | 'expand';
export type PageOrientation = 'auto' | 'portrait' | 'landscape';

export const STANDARD_PAPER_SIZES: Record<Exclude<PaperSizePreset, 'custom'>, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
  legal: [612, 1008],
  a3: [841.89, 1190.55],
  a5: [419.53, 595.28],
  tabloid: [792, 1224],
};

export interface ResizeOptions {
  preset?: PaperSizePreset;
  customDimensions?: [number, number]; // [width, height] in points
  strategy?: ResizeStrategy; // 'fit' (proportional scale) or 'expand' (add margin padding)
  margin?: number; // margin inset in points (default 0)
  orientation?: PageOrientation; // 'auto' | 'portrait' | 'landscape'
}

export interface ResizeResult {
  resizedBytes: Uint8Array;
  originalSize: number;
  outputSize: number;
  pageCount: number;
  targetWidth: number;
  targetHeight: number;
}

/**
 * Calculates draw coordinates and dimensions for fitting source page inside target canvas
 */
export function calculateFitBounds(
  srcW: number,
  srcH: number,
  targetW: number,
  targetH: number,
  margin = 0
): { x: number; y: number; width: number; height: number; scale: number } {
  const availW = Math.max(10, targetW - 2 * margin);
  const availH = Math.max(10, targetH - 2 * margin);

  const scale = Math.min(availW / srcW, availH / srcH);
  const drawW = Math.round(srcW * scale * 100) / 100;
  const drawH = Math.round(srcH * scale * 100) / 100;

  const x = Math.round(((targetW - drawW) / 2) * 100) / 100;
  const y = Math.round(((targetH - drawH) / 2) * 100) / 100;

  return { x, y, width: drawW, height: drawH, scale };
}

/**
 * Resizes, scales, or expands the page canvas of a PDF document
 */
export async function resizePdfPages(
  inputBytes: Uint8Array,
  options: ResizeOptions = {}
): Promise<ResizeResult> {
  const originalSize = inputBytes.length;
  const srcDoc = await PDFDocument.load(inputBytes, { ignoreEncryption: true });
  const pageCount = srcDoc.getPageCount();

  if (pageCount === 0) {
    throw new Error('PDF document contains no pages.');
  }

  const {
    preset = 'a4',
    customDimensions,
    strategy = 'fit',
    margin = 0,
    orientation = 'auto',
  } = options;

  // Ensure all pages have a Contents stream (guards against MissingPageContentsEmbeddingError)
  srcDoc.getPages().forEach((p) => {
    if (!p.node.Contents()) {
      const emptyStream = srcDoc.context.stream('');
      const emptyRef = srcDoc.context.register(emptyStream);
      p.node.set(PDFName.of('Contents'), emptyRef);
    }
  });

  let baseDimensions: [number, number];
  if (preset === 'custom' && customDimensions) {
    baseDimensions = customDimensions;
  } else if (preset !== 'custom' && STANDARD_PAPER_SIZES[preset]) {
    baseDimensions = STANDARD_PAPER_SIZES[preset];
  } else {
    baseDimensions = STANDARD_PAPER_SIZES.a4;
  }

  const destDoc = await PDFDocument.create();
  const embeddedPages = await destDoc.embedPdf(srcDoc, srcDoc.getPageIndices());

  let finalTargetW = 0;
  let finalTargetH = 0;

  for (let i = 0; i < pageCount; i++) {
    const srcPage = srcDoc.getPage(i);
    const srcW = srcPage.getWidth();
    const srcH = srcPage.getHeight();

    let targetW = baseDimensions[0];
    let targetH = baseDimensions[1];

    if (strategy === 'expand') {
      // Expand mode: expand canvas around existing page by margin
      targetW = srcW + margin * 2;
      targetH = srcH + margin * 2;

      const sheet = destDoc.addPage([targetW, targetH]);
      sheet.drawPage(embeddedPages[i], {
        x: margin,
        y: margin,
        width: srcW,
        height: srcH,
      });

      finalTargetW = targetW;
      finalTargetH = targetH;
      continue;
    }

    // Fit mode: handle orientation
    const isSourceLandscape = srcW > srcH;
    let shouldBeLandscape = false;

    if (orientation === 'landscape') {
      shouldBeLandscape = true;
    } else if (orientation === 'portrait') {
      shouldBeLandscape = false;
    } else {
      // auto: match source page aspect ratio
      shouldBeLandscape = isSourceLandscape;
    }

    if (shouldBeLandscape && targetW < targetH) {
      [targetW, targetH] = [targetH, targetW];
    } else if (!shouldBeLandscape && targetW > targetH) {
      [targetW, targetH] = [targetH, targetW];
    }

    const { x, y, width: drawW, height: drawH } = calculateFitBounds(
      srcW,
      srcH,
      targetW,
      targetH,
      margin
    );

    const sheet = destDoc.addPage([targetW, targetH]);
    sheet.drawPage(embeddedPages[i], {
      x,
      y,
      width: drawW,
      height: drawH,
    });

    finalTargetW = targetW;
    finalTargetH = targetH;
  }

  const resizedBytes = await destDoc.save({ useObjectStreams: false });

  return {
    resizedBytes,
    originalSize,
    outputSize: resizedBytes.length,
    pageCount,
    targetWidth: Math.round(finalTargetW * 100) / 100,
    targetHeight: Math.round(finalTargetH * 100) / 100,
  };
}
