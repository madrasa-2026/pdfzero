import {
  PDFDocument,
  PDFName,
  PDFArray,
  PDFRef,
  PDFStream,
  PDFRawStream,
  PDFPage,
  PDFEmbeddedPage,
} from 'pdf-lib';

export type OverlayLayerType = 'underlay' | 'overlay';
export type OverlayPageTarget = 'all' | 'first' | 'odd' | 'even' | 'custom';
export type OverlayScaling = 'fit' | 'center' | 'stretch';

export interface OverlayOptions {
  layer?: OverlayLayerType; // 'underlay' (behind text) or 'overlay' (on top of text)
  target?: OverlayPageTarget; // 'all', 'first', 'odd', 'even', 'custom'
  customRange?: string; // e.g. "1, 3-5"
  opacity?: number; // 0.1 to 1.0 (default 1.0)
  scaleMode?: OverlayScaling; // 'fit' (proportional), 'stretch' (fill box), or 'center' (native size)
}

export interface OverlayResult {
  outputBytes: Uint8Array;
  originalSize: number;
  outputSize: number;
  pagesModified: number;
  layer: OverlayLayerType;
  target: OverlayPageTarget;
}

/**
 * Resolves 0-based target page indices based on target selection and custom range
 */
export function resolveTargetPageIndices(
  totalTargetPages: number,
  target: OverlayPageTarget = 'all',
  customRange?: string
): number[] {
  if (totalTargetPages <= 0) return [];

  if (target === 'first') {
    return [0];
  }

  if (target === 'all') {
    return Array.from({ length: totalTargetPages }, (_, i) => i);
  }

  if (target === 'odd') {
    // 1-based odd pages: 1, 3, 5 -> 0-based indices 0, 2, 4
    const indices: number[] = [];
    for (let i = 0; i < totalTargetPages; i += 2) {
      indices.push(i);
    }
    return indices;
  }

  if (target === 'even') {
    // 1-based even pages: 2, 4, 6 -> 0-based indices 1, 3, 5
    const indices: number[] = [];
    for (let i = 1; i < totalTargetPages; i += 2) {
      indices.push(i);
    }
    return indices;
  }

  if (target === 'custom' && customRange) {
    const selected = new Set<number>();
    const parts = customRange.split(',').map((p) => p.trim());

    for (const part of parts) {
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-').map((s) => s.trim());
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end)) {
          const from = Math.max(1, Math.min(start, end));
          const to = Math.min(totalTargetPages, Math.max(start, end));
          for (let p = from; p <= to; p++) {
            selected.add(p - 1);
          }
        }
      } else {
        const p = parseInt(part, 10);
        if (!isNaN(p) && p >= 1 && p <= totalTargetPages) {
          selected.add(p - 1);
        }
      }
    }

    return Array.from(selected).sort((a, b) => a - b);
  }

  return Array.from({ length: totalTargetPages }, (_, i) => i);
}

/**
 * Calculates placement rectangle and scale factors for embedding template on target page
 */
export function calculatePlacement(
  targetWidth: number,
  targetHeight: number,
  templateWidth: number,
  templateHeight: number,
  scaleMode: OverlayScaling = 'fit'
): { x: number; y: number; width: number; height: number; xScale: number; yScale: number } {
  if (scaleMode === 'stretch') {
    return {
      x: 0,
      y: 0,
      width: targetWidth,
      height: targetHeight,
      xScale: targetWidth / templateWidth,
      yScale: targetHeight / templateHeight,
    };
  }

  if (scaleMode === 'center') {
    const x = (targetWidth - templateWidth) / 2;
    const y = (targetHeight - templateHeight) / 2;
    return {
      x,
      y,
      width: templateWidth,
      height: templateHeight,
      xScale: 1.0,
      yScale: 1.0,
    };
  }

  // Default: 'fit' (preserve aspect ratio to fit inside or match target box)
  const scale = Math.min(targetWidth / templateWidth, targetHeight / templateHeight);
  const w = templateWidth * scale;
  const h = templateHeight * scale;
  const x = (targetWidth - w) / 2;
  const y = (targetHeight - h) / 2;

  return {
    x,
    y,
    width: w,
    height: h,
    xScale: scale,
    yScale: scale,
  };
}

/**
 * Prepends an embedded page XObject stream to render behind existing content
 */
function prependEmbeddedPageUnderlay(
  doc: PDFDocument,
  page: PDFPage,
  embedded: PDFEmbeddedPage,
  placement: { x: number; y: number; xScale: number; yScale: number },
  opacity = 1.0
): void {
  const xObjectKey = (page.node as any).newXObject('EmbeddedPdfPage', embedded.ref);
  const gsKey = opacity < 0.999 ? (page as any).maybeEmbedGraphicsState({ opacity }) : undefined;

  const gsCmd = gsKey ? `${gsKey.toString()} gs\n` : '';
  const streamContent = `q\n${gsCmd}${placement.xScale.toFixed(4)} 0 0 ${placement.yScale.toFixed(4)} ${placement.x.toFixed(2)} ${placement.y.toFixed(2)} cm\n${xObjectKey.toString()} Do\nQ\n`;
  const bgStream = doc.context.stream(streamContent);
  const bgRef = doc.context.register(bgStream);

  const contents = page.node.Contents();

  if (!contents) {
    page.node.set(PDFName.of('Contents'), bgRef);
  } else if (contents instanceof PDFArray) {
    contents.insert(0, bgRef);
  } else if (contents instanceof PDFRef) {
    const newArray = doc.context.obj([bgRef, contents]);
    page.node.set(PDFName.of('Contents'), newArray);
  } else if (contents instanceof PDFStream || contents instanceof PDFRawStream) {
    const existingRef = doc.context.register(contents);
    const newArray = doc.context.obj([bgRef, existingRef]);
    page.node.set(PDFName.of('Contents'), newArray);
  }
}

/**
 * Main engine: Composites template pages onto target document pages as an underlay or overlay
 */
export async function applyPdfOverlay(
  targetPdfBytes: Uint8Array,
  templatePdfBytes: Uint8Array,
  options: OverlayOptions = {}
): Promise<OverlayResult> {
  const layer = options.layer || 'underlay';
  const target = options.target || 'all';
  const opacity = Math.max(0.05, Math.min(1.0, options.opacity ?? 1.0));
  const scaleMode = options.scaleMode || 'fit';

  const targetDoc = await PDFDocument.load(targetPdfBytes, {
    updateMetadata: false,
    ignoreEncryption: true,
  });

  const templateDoc = await PDFDocument.load(templatePdfBytes, {
    updateMetadata: false,
    ignoreEncryption: true,
  });

  const targetPageCount = targetDoc.getPageCount();
  const templatePages = templateDoc.getPages();
  const templatePageCount = templatePages.length;

  if (targetPageCount === 0 || templatePageCount === 0) {
    throw new Error('Target document or template document has no pages.');
  }

  // Embed template pages into target document
  const embeddedTemplates = await targetDoc.embedPages(templatePages);

  const targetIndices = resolveTargetPageIndices(targetPageCount, target, options.customRange);

  for (const pageIndex of targetIndices) {
    const targetPage = targetDoc.getPage(pageIndex);
    const targetWidth = targetPage.getWidth();
    const targetHeight = targetPage.getHeight();

    // Map template page: 1-to-1 if template has multiple pages, otherwise repeat page 0
    const templateIndex = templatePageCount === 1 ? 0 : Math.min(pageIndex, templatePageCount - 1);
    const embedded = embeddedTemplates[templateIndex];

    const placement = calculatePlacement(
      targetWidth,
      targetHeight,
      embedded.width,
      embedded.height,
      scaleMode
    );

    if (layer === 'underlay') {
      prependEmbeddedPageUnderlay(targetDoc, targetPage, embedded, placement, opacity);
    } else {
      targetPage.drawPage(embedded, {
        x: placement.x,
        y: placement.y,
        width: placement.width,
        height: placement.height,
        opacity,
      });
    }
  }

  const outputBytes = await targetDoc.save();

  return {
    outputBytes,
    originalSize: targetPdfBytes.length,
    outputSize: outputBytes.length,
    pagesModified: targetIndices.length,
    layer,
    target,
  };
}
