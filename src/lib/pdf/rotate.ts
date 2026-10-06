import { PDFDocument, degrees } from 'pdf-lib';
import { MAX_FILE_SIZE_BYTES } from './merge';

export interface RotateProgress {
  message: string;
  percent: number;
}

/**
 * Applies permanent page rotation angles (in degrees) to specific pages in a PDF document.
 * 
 * @param file The PDF File object to manipulate.
 * @param deltaMap Map of 1-based page numbers to rotation offsets (e.g. 90, 180, 270).
 * @param onProgress Optional progress callback.
 * @returns Uint8Array of the modified PDF document bytes.
 */
export async function rotatePdfPages(
  file: File,
  deltaMap: Map<number, number>,
  onProgress?: (progress: RotateProgress) => void
): Promise<Uint8Array> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File exceeds the 100MB limit.`);
  }

  onProgress?.({ message: 'Loading PDF document into memory...', percent: 15 });
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);

  const pages = pdfDoc.getPages();
  const totalPages = pages.length;

  onProgress?.({ message: 'Applying page orientation adjustments...', percent: 50 });

  pages.forEach((page, index) => {
    const pageNum = index + 1;
    const delta = deltaMap.get(pageNum) || 0;
    if (delta !== 0) {
      const currentAngle = page.getRotation().angle;
      let newAngle = (currentAngle + delta) % 360;
      if (newAngle < 0) newAngle += 360;
      page.setRotation(degrees(newAngle));
    }
  });

  onProgress?.({ message: 'Saving updated PDF...', percent: 85 });
  const resultBytes = await pdfDoc.save();

  onProgress?.({ message: 'Rotation complete!', percent: 100 });
  return resultBytes;
}
