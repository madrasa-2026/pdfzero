import { PDFDocument, degrees } from 'pdf-lib';

export interface PagePlan {
  sourcePageIndex: number; // 0-indexed reference to original page, or -1 for blank page
  rotationDegrees: number; // Additional clockwise rotation: 0, 90, 180, 270
}

/**
 * Recompiles a PDF according to an arbitrary user visual arrangement plan.
 * Supports reordering, deletion, duplication, per-page rotation, and blank page insertion.
 * Preserves 100% vector typography, annotations, and form data with zero rasterization.
 */
export async function reorganizePdfDocument(
  pdfBytes: Uint8Array,
  plan: PagePlan[]
): Promise<Uint8Array> {
  if (!plan || plan.length === 0) {
    throw new Error('Reorganization plan must specify at least one page.');
  }

  const srcDoc = await PDFDocument.load(pdfBytes);
  const srcPageCount = srcDoc.getPageCount();

  // Guard against invalid source page indices
  for (const item of plan) {
    if (item.sourcePageIndex !== -1 && (item.sourcePageIndex < 0 || item.sourcePageIndex >= srcPageCount)) {
      throw new Error(`Invalid source page index: ${item.sourcePageIndex}. Document only has ${srcPageCount} pages.`);
    }
  }

  const destDoc = await PDFDocument.create();

  // Reference page dimensions for blank pages
  const refPage = srcPageCount > 0 ? srcDoc.getPage(0) : null;
  const refWidth = refPage ? refPage.getWidth() : 595.28;
  const refHeight = refPage ? refPage.getHeight() : 841.89;

  for (const item of plan) {
    if (item.sourcePageIndex === -1) {
      // Insert blank page
      const blank = destDoc.addPage([refWidth, refHeight]);
      const normAngle = ((item.rotationDegrees % 360) + 360) % 360;
      if (normAngle !== 0) {
        blank.setRotation(degrees(normAngle));
      }
    } else {
      // Copy existing page
      const [copiedPage] = await destDoc.copyPages(srcDoc, [item.sourcePageIndex]);
      const originalAngle = copiedPage.getRotation().angle || 0;
      const combinedAngle = ((originalAngle + item.rotationDegrees) % 360 + 360) % 360;
      copiedPage.setRotation(degrees(combinedAngle));
      destDoc.addPage(copiedPage);
    }
  }

  return await destDoc.save();
}
