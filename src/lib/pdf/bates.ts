import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export type BatesPosition =
  | 'topLeft'
  | 'topCenter'
  | 'topRight'
  | 'bottomLeft'
  | 'bottomCenter'
  | 'bottomRight';

export interface BatesOptions {
  prefix?: string;
  startNumber?: number;
  digits?: number;
  suffix?: string;
  position?: BatesPosition;
  fontSize?: number;
  marginX?: number;
  marginY?: number;
  colorHex?: string;
}

export interface BatesResult {
  stampedPdfBytes: Uint8Array;
  originalSize: number;
  stampedSize: number;
  pagesStamped: number;
  batesStart: string;
  batesEnd: string;
  details: string[];
}

/**
 * Formats a single Bates sequence string based on page offset and configuration.
 */
export function formatBatesNumber(index: number, options: BatesOptions = {}): string {
  const prefix = options.prefix || '';
  const suffix = options.suffix || '';
  const startNumber = options.startNumber ?? 1;
  const digits = options.digits ?? 6;

  const currentVal = startNumber + index;
  const paddedNumber = String(currentVal).padStart(digits, '0');

  return `${prefix}${paddedNumber}${suffix}`;
}

/**
 * Calculates (x, y) coordinates for a Bates stamp on a given page geometry.
 */
export function calculateBatesPosition(
  pageWidth: number,
  pageHeight: number,
  textWidth: number,
  textHeight: number,
  position: BatesPosition = 'bottomRight',
  marginX: number = 36,
  marginY: number = 30
): { x: number; y: number } {
  let x = 0;
  let y = 0;

  switch (position) {
    case 'topLeft':
      x = marginX;
      y = pageHeight - marginY - textHeight;
      break;
    case 'topCenter':
      x = (pageWidth - textWidth) / 2;
      y = pageHeight - marginY - textHeight;
      break;
    case 'topRight':
      x = pageWidth - marginX - textWidth;
      y = pageHeight - marginY - textHeight;
      break;
    case 'bottomLeft':
      x = marginX;
      y = marginY;
      break;
    case 'bottomCenter':
      x = (pageWidth - textWidth) / 2;
      y = marginY;
      break;
    case 'bottomRight':
    default:
      x = pageWidth - marginX - textWidth;
      y = marginY;
      break;
  }

  return {
    x: Math.max(0, x),
    y: Math.max(0, y),
  };
}

function hexToRgb(hex?: string) {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) {
    return rgb(0.1, 0.1, 0.1);
  }
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return rgb(r, g, b);
}

/**
 * Applies sequential vector Bates numbering across all pages of a PDF document.
 */
export async function applyBatesNumbering(
  bytes: Uint8Array,
  options: BatesOptions = {}
): Promise<BatesResult> {
  const originalSize = bytes.length;
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pageCount = doc.getPageCount();

  const fontSize = options.fontSize || 10;
  const position = options.position || 'bottomRight';
  const marginX = options.marginX ?? 36;
  const marginY = options.marginY ?? 30;
  const textColor = hexToRgb(options.colorHex);

  let batesStart = '';
  let batesEnd = '';

  for (let i = 0; i < pageCount; i++) {
    const page = doc.getPage(i);
    const pageWidth = page.getWidth();
    const pageHeight = page.getHeight();

    const batesText = formatBatesNumber(i, options);
    if (i === 0) batesStart = batesText;
    if (i === pageCount - 1) batesEnd = batesText;

    const textWidth = font.widthOfTextAtSize(batesText, fontSize);
    const textHeight = font.heightAtSize(fontSize);

    const coords = calculateBatesPosition(
      pageWidth,
      pageHeight,
      textWidth,
      textHeight,
      position,
      marginX,
      marginY
    );

    page.drawText(batesText, {
      x: coords.x,
      y: coords.y,
      size: fontSize,
      font,
      color: textColor,
    });
  }

  const stampedPdfBytes = await doc.save({ useObjectStreams: false });

  const details = [
    `Applied sequential Bates stamps: ${batesStart} → ${batesEnd}`,
    `Stamped ${pageCount} page(s) at ${position}`,
    `100% vector typography preserved`,
  ];

  return {
    stampedPdfBytes,
    originalSize,
    stampedSize: stampedPdfBytes.length,
    pagesStamped: pageCount,
    batesStart,
    batesEnd,
    details,
  };
}
