if (typeof Uint8Array !== 'undefined' && !('toHex' in Uint8Array.prototype)) {
  // @ts-ignore
  Uint8Array.prototype.toHex = function () {
    return Array.from(this, (b: number) => b.toString(16).padStart(2, '0')).join('');
  };
}

export interface TableTextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TableRow {
  y: number;
  items: TableTextItem[];
}

export interface ExtractorOptions {
  yTolerance?: number; // Vertical row clustering tolerance in points (default: 4)
  minColumnGap?: number; // Minimum gap in points to distinguish columns (default: 15)
  pageRange?: string; // e.g. "all" or "1, 3-5"
  delimiter?: string; // CSV field separator (default: ',')
}

export interface TablePageResult {
  pageNumber: number;
  grid: string[][];
  rowCount: number;
  colCount: number;
}

export interface TableExtractionResult {
  csv: string;
  tables: TablePageResult[];
  rowCount: number;
  pageCount: number;
}

/**
 * Clusters extracted text items into horizontal table rows based on vertical Y coordinates
 */
export function clusterRows(
  items: TableTextItem[],
  yTolerance = 4
): TableRow[] {
  const validItems = items.filter((item) => item.text && item.text.trim().length > 0);
  if (validItems.length === 0) return [];

  // Sort primarily top-to-bottom (descending Y in PDF coordinates), secondarily left-to-right (ascending X)
  const sorted = [...validItems].sort((a, b) => {
    if (Math.abs(a.y - b.y) > yTolerance) {
      return b.y - a.y;
    }
    return a.x - b.x;
  });

  const rows: TableRow[] = [];
  let currentRow: TableRow = { y: sorted[0].y, items: [sorted[0]] };

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i];
    if (Math.abs(item.y - currentRow.y) <= yTolerance) {
      currentRow.items.push(item);
    } else {
      // Sort items in completed row left-to-right
      currentRow.items.sort((a, b) => a.x - b.x);
      rows.push(currentRow);
      currentRow = { y: item.y, items: [item] };
    }
  }

  currentRow.items.sort((a, b) => a.x - b.x);
  rows.push(currentRow);

  return rows;
}

/**
 * Detects global column starting boundaries across all rows
 */
export function detectColumnBounds(
  rows: TableRow[],
  minGap = 15
): number[] {
  if (rows.length === 0) return [];

  // Collect all item X coordinates
  const xPositions: number[] = [];
  for (const row of rows) {
    for (const item of row.items) {
      xPositions.push(Math.round(item.x));
    }
  }

  if (xPositions.length === 0) return [];

  xPositions.sort((a, b) => a - b);

  // Cluster nearby X positions into distinct column boundaries
  const columnBounds: number[] = [];
  let currentCluster: number[] = [xPositions[0]];

  for (let i = 1; i < xPositions.length; i++) {
    const x = xPositions[i];
    const prev = currentCluster[currentCluster.length - 1];

    if (x - prev <= minGap * 0.7) {
      currentCluster.push(x);
    } else {
      const avg = Math.round(
        currentCluster.reduce((sum, val) => sum + val, 0) / currentCluster.length
      );
      columnBounds.push(avg);
      currentCluster = [x];
    }
  }

  if (currentCluster.length > 0) {
    const avg = Math.round(
      currentCluster.reduce((sum, val) => sum + val, 0) / currentCluster.length
    );
    columnBounds.push(avg);
  }

  return columnBounds;
}

/**
 * Aligns row items into a structured 2D grid of cells using detected column boundaries
 */
export function formatRowsToGrid(
  rows: TableRow[],
  columnBounds: number[]
): string[][] {
  if (rows.length === 0) return [];
  if (columnBounds.length === 0) {
    return rows.map((r) => [r.items.map((i) => i.text).join(' ')]);
  }

  const grid: string[][] = [];

  for (const row of rows) {
    const rowCells = new Array(columnBounds.length).fill('');

    for (const item of row.items) {
      // Find closest column boundary
      let closestCol = 0;
      let minDistance = Math.abs(item.x - columnBounds[0]);

      for (let c = 1; c < columnBounds.length; c++) {
        const dist = Math.abs(item.x - columnBounds[c]);
        if (dist < minDistance) {
          minDistance = dist;
          closestCol = c;
        }
      }

      if (rowCells[closestCol]) {
        rowCells[closestCol] += ' ' + item.text.trim();
      } else {
        rowCells[closestCol] = item.text.trim();
      }
    }

    grid.push(rowCells);
  }

  return grid;
}

/**
 * Formats a 2D grid of strings into standard RFC 4180 CSV
 */
export function serializeGridToCsv(
  grid: string[][],
  delimiter = ','
): string {
  if (grid.length === 0) return '';

  return grid
    .map((row) =>
      row
        .map((cell) => {
          const val = cell || '';
          const needsQuotes =
            val.includes(delimiter) ||
            val.includes('"') ||
            val.includes('\n') ||
            val.includes('\r');

          if (needsQuotes) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        })
        .join(delimiter)
    )
    .join('\r\n');
}

/**
 * Extracts all tabular structures from a PDF document into CSV format
 */
export async function extractTablesFromPdf(
  pdfBytes: Uint8Array,
  options: ExtractorOptions = {}
): Promise<TableExtractionResult> {
  const yTolerance = options.yTolerance ?? 4;
  const minColumnGap = options.minColumnGap ?? 15;
  const delimiter = options.delimiter ?? ',';

  // Dynamic import of pdfjs-dist for client and node compatibility
  let pdfjsLib: any;
  try {
    pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  } catch {
    pdfjsLib = await import('pdfjs-dist');
  }

  const loadingTask = pdfjsLib.getDocument({
    data: pdfBytes,
    useSystemFonts: true,
  });

  const pdfDoc = await loadingTask.promise;
  const totalPages = pdfDoc.numPages;

  const tables: TablePageResult[] = [];
  const fullGrid: string[][] = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();

    const items: TableTextItem[] = [];

    for (const item of textContent.items) {
      if ('str' in item && typeof item.str === 'string') {
        const text = item.str;
        const transform = item.transform; // [scaleX, skewY, skewX, scaleY, x, y]
        const x = transform[4];
        const y = transform[5];
        const width = item.width || 0;
        const height = item.height || Math.abs(transform[0]) || 12;

        items.push({ text, x, y, width, height });
      }
    }

    if (items.length > 0) {
      const rows = clusterRows(items, yTolerance);
      const columnBounds = detectColumnBounds(rows, minColumnGap);
      const grid = formatRowsToGrid(rows, columnBounds);

      if (grid.length > 0) {
        tables.push({
          pageNumber: pageNum,
          grid,
          rowCount: grid.length,
          colCount: columnBounds.length,
        });

        // Add page break or separator if multi-page
        if (fullGrid.length > 0) {
          // Add blank line between multi-page tables
          fullGrid.push(new Array(columnBounds.length).fill(''));
        }
        for (const row of grid) {
          fullGrid.push(row);
        }
      }
    }
  }

  const csv = serializeGridToCsv(fullGrid, delimiter);
  const totalRows = fullGrid.filter((r) => r.some((c) => c.trim().length > 0)).length;

  return {
    csv,
    tables,
    rowCount: totalRows,
    pageCount: totalPages,
  };
}
