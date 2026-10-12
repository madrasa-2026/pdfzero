if (typeof Uint8Array !== 'undefined' && !('toHex' in Uint8Array.prototype)) {
  // @ts-ignore
  Uint8Array.prototype.toHex = function () {
    return Array.from(this, (b: number) => b.toString(16).padStart(2, '0')).join('');
  };
}

import type { PDFDocumentProxy } from 'pdfjs-dist';

export interface ExtractedTextItem {
  id: string;
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  pageNumber: number;
}

export interface TextMatch {
  id: string;
  item: ExtractedTextItem;
  query: string;
  pageNumber: number;
  matchStartIndex: number;
  matchEndIndex: number;
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Extracts text items from a specific page of a PDF document using pdfjs-dist.
 * Calculates normalized top-down screen coordinates (x, y, width, height) relative to scale = 1.
 */
export async function extractPageTextItems(
  pdfDoc: PDFDocumentProxy | any,
  pageNumber: number
): Promise<ExtractedTextItem[]> {
  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1 });
  const textContent = await page.getTextContent();
  const pageHeight = viewport.height;

  const items: ExtractedTextItem[] = [];
  let itemIndex = 0;

  for (const item of textContent.items) {
    if ('str' in item && item.str.length > 0) {
      const tx = item.transform[4];
      const ty = item.transform[5];
      const fontSize =
        Math.hypot(item.transform[2], item.transform[3]) ||
        Math.abs(item.transform[0]) ||
        item.height ||
        12;
      const width = item.width || item.str.length * fontSize * 0.5;
      const height = item.height || fontSize;

      // Screen coordinate: (0, 0) is top-left
      const x = tx;
      const y = pageHeight - ty - height;

      items.push({
        id: `p${pageNumber}-item-${itemIndex++}`,
        str: item.str,
        x: Math.max(0, x),
        y: Math.max(0, y),
        width: Math.max(1, width),
        height: Math.max(1, height),
        fontSize,
        pageNumber,
      });
    }
  }

  return items;
}

/**
 * Searches for all case-insensitive occurrences of query within extracted text items.
 * Computes bounding boxes for visual highlight/whiteout overlay placement.
 */
export function findTextMatches(
  items: ExtractedTextItem[],
  query: string
): TextMatch[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const queryLower = trimmed.toLowerCase();
  const matches: TextMatch[] = [];
  let matchCounter = 0;

  for (const item of items) {
    const textLower = item.str.toLowerCase();
    let startIndex = 0;

    while (startIndex < textLower.length) {
      const foundIdx = textLower.indexOf(queryLower, startIndex);
      if (foundIdx === -1) break;

      const endIndex = foundIdx + trimmed.length;
      const charWidth = item.str.length > 0 ? item.width / item.str.length : 10;
      const matchX = item.x + foundIdx * charWidth;
      const matchWidth = trimmed.length * charWidth;

      matches.push({
        id: `match-${item.id}-${matchCounter++}`,
        item,
        query: trimmed,
        pageNumber: item.pageNumber,
        matchStartIndex: foundIdx,
        matchEndIndex: endIndex,
        box: {
          x: matchX,
          y: item.y,
          width: Math.max(5, matchWidth),
          height: item.height,
        },
      });

      startIndex = foundIdx + 1;
    }
  }

  return matches;
}
