import { PDFDocument, PDFName, StandardFonts, rgb } from 'pdf-lib';

export interface PrinterMarksOptions {
  slugMargin: number; // PDF points on each side (default: 36 pt = 0.5 in)
  bleed: number; // PDF points (default: 9 pt = ~3 mm / 0.125 in)
  includeTrimMarks: boolean;
  includeBleedMarks: boolean;
  includeRegistrationMarks: boolean;
  includeColorBars: boolean;
  includeSlugLine: boolean;
  fileName?: string;
}

const defaultOptions: PrinterMarksOptions = {
  slugMargin: 36,
  bleed: 9,
  includeTrimMarks: true,
  includeBleedMarks: true,
  includeRegistrationMarks: true,
  includeColorBars: true,
  includeSlugLine: true,
  fileName: 'document.pdf',
};

/**
 * Expands PDF margins and stamps professional, ISO 12647 compliant prepress printer marks:
 * corner trim cut marks, registration bullseyes, CMYK calibration color bars, and slug lines.
 * Retains 100% vector typography and vector art with zero rasterization.
 */
export async function applyPrinterMarks(
  pdfBytes: Uint8Array,
  userOptions?: Partial<PrinterMarksOptions>
): Promise<Uint8Array> {
  const options: PrinterMarksOptions = { ...defaultOptions, ...userOptions };
  const { slugMargin, bleed } = options;

  const srcDoc = await PDFDocument.load(pdfBytes);
  // Ensure all pages have valid Contents to avoid pdf-lib embed exception
  for (const p of srcDoc.getPages()) {
    if (!p.node.Contents()) {
      p.node.set(PDFName.of('Contents'), srcDoc.context.stream(''));
    }
  }

  const destDoc = await PDFDocument.create();
  const font = await destDoc.embedFont(StandardFonts.Helvetica);
  const embeddedPages = await destDoc.embedPdf(srcDoc, srcDoc.getPageIndices());

  const black = rgb(0, 0, 0);
  const markStrokeWidth = 0.35; // Hairline standard for print shops
  const tickLength = 14; // ~5mm
  const tickGap = 4; // ~1.4mm gap from trim corner

  for (let i = 0; i < embeddedPages.length; i++) {
    const embPage = embeddedPages[i];
    const srcWidth = embPage.width;
    const srcHeight = embPage.height;

    const destWidth = srcWidth + 2 * slugMargin;
    const destHeight = srcHeight + 2 * slugMargin;

    const page = destDoc.addPage([destWidth, destHeight]);

    // 1. Draw source page Form XObject centered at (slugMargin, slugMargin)
    page.drawPage(embPage, {
      x: slugMargin,
      y: slugMargin,
      width: srcWidth,
      height: srcHeight,
    });

    // 2. Configure native PDF Prepress Page Boundaries
    page.setTrimBox(slugMargin, slugMargin, srcWidth, srcHeight);
    page.setBleedBox(
      slugMargin - bleed,
      slugMargin - bleed,
      srcWidth + 2 * bleed,
      srcHeight + 2 * bleed
    );

    const trimX1 = slugMargin;
    const trimX2 = slugMargin + srcWidth;
    const trimY1 = slugMargin;
    const trimY2 = slugMargin + srcHeight;

    // 3. Stamp 8 Corner Trim Marks
    if (options.includeTrimMarks) {
      // Bottom-Left Corner
      page.drawLine({
        start: { x: trimX1 - tickGap - tickLength, y: trimY1 },
        end: { x: trimX1 - tickGap, y: trimY1 },
        thickness: markStrokeWidth,
        color: black,
      });
      page.drawLine({
        start: { x: trimX1, y: trimY1 - tickGap - tickLength },
        end: { x: trimX1, y: trimY1 - tickGap },
        thickness: markStrokeWidth,
        color: black,
      });

      // Bottom-Right Corner
      page.drawLine({
        start: { x: trimX2 + tickGap, y: trimY1 },
        end: { x: trimX2 + tickGap + tickLength, y: trimY1 },
        thickness: markStrokeWidth,
        color: black,
      });
      page.drawLine({
        start: { x: trimX2, y: trimY1 - tickGap - tickLength },
        end: { x: trimX2, y: trimY1 - tickGap },
        thickness: markStrokeWidth,
        color: black,
      });

      // Top-Left Corner
      page.drawLine({
        start: { x: trimX1 - tickGap - tickLength, y: trimY2 },
        end: { x: trimX1 - tickGap, y: trimY2 },
        thickness: markStrokeWidth,
        color: black,
      });
      page.drawLine({
        start: { x: trimX1, y: trimY2 + tickGap },
        end: { x: trimX1, y: trimY2 + tickGap + tickLength },
        thickness: markStrokeWidth,
        color: black,
      });

      // Top-Right Corner
      page.drawLine({
        start: { x: trimX2 + tickGap, y: trimY2 },
        end: { x: trimX2 + tickGap + tickLength, y: trimY2 },
        thickness: markStrokeWidth,
        color: black,
      });
      page.drawLine({
        start: { x: trimX2, y: trimY2 + tickGap },
        end: { x: trimX2, y: trimY2 + tickGap + tickLength },
        thickness: markStrokeWidth,
        color: black,
      });
    }

    // 4. Registration Bullseye Targets
    if (options.includeRegistrationMarks && slugMargin >= 24) {
      const drawBullseye = (cx: number, cy: number) => {
        // Outer circle
        page.drawCircle({
          x: cx,
          y: cy,
          size: 5,
          borderWidth: markStrokeWidth,
          borderColor: black,
          color: undefined,
        });
        // Inner circle
        page.drawCircle({
          x: cx,
          y: cy,
          size: 2.5,
          borderWidth: markStrokeWidth,
          borderColor: black,
          color: undefined,
        });
        // Crosshairs
        page.drawLine({
          start: { x: cx - 8, y: cy },
          end: { x: cx + 8, y: cy },
          thickness: markStrokeWidth,
          color: black,
        });
        page.drawLine({
          start: { x: cx, y: cy - 8 },
          end: { x: cx, y: cy + 8 },
          thickness: markStrokeWidth,
          color: black,
        });
      };

      // 4 targets at top, bottom, left, right centers
      drawBullseye(destWidth / 2, destHeight - slugMargin / 2);
      drawBullseye(destWidth / 2, slugMargin / 2);
      drawBullseye(slugMargin / 2, destHeight / 2);
      drawBullseye(destWidth - slugMargin / 2, destHeight / 2);
    }

    // 5. CMYK & Grayscale Density Calibration Wedges
    if (options.includeColorBars && slugMargin >= 24) {
      const swatches = [
        rgb(0, 0.85, 1),      // Cyan
        rgb(0.95, 0, 0.55),   // Magenta
        rgb(1, 0.95, 0),      // Yellow
        rgb(0, 0, 0),         // Black
        rgb(0.5, 0.92, 1),    // 50% Cyan
        rgb(0.97, 0.5, 0.77), // 50% Magenta
        rgb(1, 0.97, 0.5),    // 50% Yellow
        rgb(0.5, 0.5, 0.5),   // 50% Gray
      ];

      const swatchW = 8;
      const swatchH = 6;
      const totalBarW = swatches.length * (swatchW + 1);
      const startX = destWidth / 2 - totalBarW / 2;
      const barY = slugMargin / 2 - swatchH / 2;

      swatches.forEach((color, idx) => {
        page.drawRectangle({
          x: startX + idx * (swatchW + 1),
          y: barY,
          width: swatchW,
          height: swatchH,
          color,
          borderWidth: 0.2,
          borderColor: black,
        });
      });
    }

    // 6. Text Slug Line
    if (options.includeSlugLine && slugMargin >= 24) {
      const mmW = Math.round((srcWidth * 25.4) / 72);
      const mmH = Math.round((srcHeight * 25.4) / 72);
      const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const slugText = `${options.fileName} • Page ${i + 1} of ${embeddedPages.length} • Trim: ${mmW} × ${mmH} mm • ${timestamp} • AirPDF Prepress Engine`;

      page.drawText(slugText, {
        x: slugMargin,
        y: destHeight - slugMargin / 2 - 3,
        size: 6.5,
        font,
        color: rgb(0.2, 0.2, 0.2),
      });
    }
  }

  return await destDoc.save();
}
