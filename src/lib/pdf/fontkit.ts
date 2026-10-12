import 'regenerator-runtime/runtime.js';
import fontkit from '@pdf-lib/fontkit';
import type { PDFDocument, PDFFont } from 'pdf-lib';

let cachedFontBytes: Uint8Array | null = null;

/**
 * Checks if a string contains any Bengali Unicode characters (\u0980 - \u09FF).
 */
export function isBengaliText(text: string): boolean {
  return /[\u0980-\u09FF]/.test(text);
}

/**
 * Retrieves the TrueType font bytes for Noto Sans Bengali.
 * Seamlessly resolves in both Node.js (test/build) and Browser (client) runtimes.
 */
export async function getBengaliFontBytes(): Promise<Uint8Array> {
  if (cachedFontBytes) {
    return cachedFontBytes;
  }

  // Node.js runtime (unit tests / server build)
  if (typeof process !== 'undefined' && process.versions?.node) {
    try {
      const fs = await import('node:fs/promises');
      const path = await import('node:path');
      const fontPath = path.resolve(process.cwd(), 'public/fonts/NotoSansBengali-Regular.ttf');
      const buffer = await fs.readFile(fontPath);
      cachedFontBytes = new Uint8Array(buffer);
      return cachedFontBytes;
    } catch (err) {
      // Fallback to fetch if path resolution fails
    }
  }

  // Browser runtime
  const response = await fetch('/fonts/NotoSansBengali-Regular.ttf');
  if (!response.ok) {
    throw new Error(`Failed to load Bengali font: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  cachedFontBytes = new Uint8Array(arrayBuffer);
  return cachedFontBytes;
}

/**
 * Registers fontkit with the PDFDocument and embeds the Bengali TTF font.
 */
export async function loadBengaliFont(pdfDoc: PDFDocument): Promise<PDFFont> {
  pdfDoc.registerFontkit(fontkit);
  const fontBytes = await getBengaliFontBytes();
  return await pdfDoc.embedFont(fontBytes, { subset: true });
}
