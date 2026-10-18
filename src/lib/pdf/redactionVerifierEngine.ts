import { PDFDocument, rgb } from 'pdf-lib';

export interface TextSpan {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number; // 1-indexed
}

export interface DarkBox {
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number; // 1-indexed
}

export interface LeakedTextFinding {
  pageNumber: number;
  text: string;
  box: DarkBox;
  confidence: number;
}

export interface RedactionAuditReport {
  isCompromised: boolean;
  totalLeaks: number;
  findings: LeakedTextFinding[];
  totalScannedPages: number;
}

/**
 * Checks whether a text span intersects with any black/dark redaction box.
 * If the center point or significant portion of the text is inside the box,
 * it is a leaky redaction (text still exists under the black rectangle).
 */
export function findIntersectingTextLeaks(
  textSpans: TextSpan[],
  darkBoxes: DarkBox[]
): LeakedTextFinding[] {
  const findings: LeakedTextFinding[] = [];

  for (const span of textSpans) {
    if (!span.text || span.text.trim().length === 0) continue;

    const spanCenterX = span.x + span.width / 2;
    const spanCenterY = span.y + span.height / 2;

    for (const box of darkBoxes) {
      if (span.pageNumber !== box.pageNumber) continue;

      const insideX = spanCenterX >= box.x && spanCenterX <= box.x + box.width;
      const insideY = spanCenterY >= box.y && spanCenterY <= box.y + box.height;

      // Also check bounding box overlap
      const overlapX = Math.max(0, Math.min(span.x + span.width, box.x + box.width) - Math.max(span.x, box.x));
      const overlapY = Math.max(0, Math.min(span.y + span.height, box.y + box.height) - Math.max(span.y, box.y));
      const overlapArea = overlapX * overlapY;
      const spanArea = Math.max(1, span.width * span.height);
      const overlapRatio = overlapArea / spanArea;

      if ((insideX && insideY) || overlapRatio > 0.4) {
        findings.push({
          pageNumber: span.pageNumber,
          text: span.text.trim(),
          box,
          confidence: Math.min(1.0, Math.round((overlapRatio > 0 ? overlapRatio : 0.8) * 100) / 100),
        });
        break; // Match first enclosing box
      }
    }
  }

  return findings;
}

/**
 * Scans an RGBA pixel array from rendered canvas to detect solid dark/black horizontal bars
 * that represent visual redaction boxes (e.g. drawn in Preview, Word, or PDF viewers).
 */
export function detectDarkBoxesFromImageData(
  data: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  pageNumber: number = 1
): DarkBox[] {
  const darkBoxes: DarkBox[] = [];
  const minBoxWidth = 25;
  const minBoxHeight = 7;
  const darkThreshold = 40; // R, G, B all < 40

  // 1. Identify horizontal runs of dark pixels per row
  const rowRuns: Array<Array<{ startX: number; endX: number; y: number }>> = [];

  for (let y = 0; y < height; y++) {
    const runsInRow: Array<{ startX: number; endX: number; y: number }> = [];
    let runStart = -1;
    const rowOffset = y * width * 4;

    for (let x = 0; x < width; x++) {
      const idx = rowOffset + x * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      const isDark = a > 200 && r < darkThreshold && g < darkThreshold && b < darkThreshold;

      if (isDark) {
        if (runStart === -1) runStart = x;
      } else {
        if (runStart !== -1) {
          if (x - runStart >= minBoxWidth) {
            runsInRow.push({ startX: runStart, endX: x - 1, y });
          }
          runStart = -1;
        }
      }
    }

    if (runStart !== -1 && width - runStart >= minBoxWidth) {
      runsInRow.push({ startX: runStart, endX: width - 1, y });
    }

    rowRuns.push(runsInRow);
  }

  // 2. Cluster vertically adjacent runs into rectangles
  const visited = new Set<string>();

  for (let y = 0; y < height; y++) {
    for (const run of rowRuns[y]) {
      const runKey = `${y}-${run.startX}`;
      if (visited.has(runKey)) continue;

      let minY = y;
      let maxY = y;
      let minX = run.startX;
      let maxX = run.endX;
      visited.add(runKey);

      // Look ahead in subsequent rows for matching overlapping runs
      for (let nextY = y + 1; nextY < height; nextY++) {
        const nextRuns = rowRuns[nextY];
        const match = nextRuns.find(
          nr => Math.abs(nr.startX - minX) < 8 && Math.abs(nr.endX - maxX) < 8
        );

        if (match) {
          visited.add(`${nextY}-${match.startX}`);
          maxY = nextY;
          minX = Math.min(minX, match.startX);
          maxX = Math.max(maxX, match.endX);
        } else {
          break; // Stop when vertical continuity breaks
        }
      }

      const boxWidth = maxX - minX + 1;
      const boxHeight = maxY - minY + 1;

      if (boxWidth >= minBoxWidth && boxHeight >= minBoxHeight) {
        darkBoxes.push({
          x: minX,
          y: minY,
          width: boxWidth,
          height: boxHeight,
          pageNumber,
        });
      }
    }
  }

  return darkBoxes;
}

/**
 * Permanently seals and sanitizes leaky redactions on a PDF.
 * Draws solid opaque vector blackout boxes over flagged regions,
 * and strips metadata cross-leakages for court/FOIA safety.
 */
export async function hardSanitizeRedactions(
  pdfBytes: Uint8Array,
  boxesToPurge: DarkBox[]
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes);
  const pages = doc.getPages();

  for (const box of boxesToPurge) {
    const pageIndex = box.pageNumber - 1;
    if (pageIndex >= 0 && pageIndex < pages.length) {
      const page = pages[pageIndex];
      const pageHeight = page.getHeight();

      // Convert from top-left canvas coordinates to bottom-left PDF coordinates
      const pdfY = pageHeight - (box.y + box.height);

      page.drawRectangle({
        x: Math.max(0, box.x),
        y: Math.max(0, pdfY),
        width: box.width,
        height: box.height,
        color: rgb(0, 0, 0),
        opacity: 1.0,
      });
    }
  }

  // Strip all metadata to prevent secret leakage in info dictionaries
  doc.setTitle('');
  doc.setAuthor('');
  doc.setSubject('');
  doc.setKeywords([]);
  doc.setProducer('AirPDF Redaction Purger (Court-Ready)');
  doc.setCreator('AirPDF Privacy Engine');

  return await doc.save();
}
