import { PDFDocument } from 'pdf-lib';
import { MAX_FILE_SIZE_BYTES } from './merge';

export type ImagePageOrientation = 'auto' | 'portrait' | 'landscape';
export type ImagePageSize = 'fit' | 'a4' | 'letter';
export type ImageMargin = 'none' | 'small' | 'large';

export interface ImagePdfOptions {
  orientation: ImagePageOrientation;
  pageSize: ImagePageSize;
  margin: ImageMargin;
}

export interface ImagePdfProgress {
  message: string;
  percent: number;
}

const PAGE_SIZES = {
  a4: { width: 595.28, height: 841.89 },
  letter: { width: 612.0, height: 792.0 },
};

const MARGIN_SIZES = {
  none: 0,
  small: 20,
  large: 40,
};

async function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to decode image "${file.name}"`));
    };
    img.src = url;
  });
}

async function getEmbeddedImage(pdfDoc: PDFDocument, file: File, img: HTMLImageElement) {
  // If direct JPG/PNG, try native embed first
  const isJpg = file.type === 'image/jpeg' || /\.(jpe?g)$/i.test(file.name);
  const isPng = file.type === 'image/png' || /\.png$/i.test(file.name);

  if (isJpg) {
    try {
      const buffer = await file.arrayBuffer();
      return await pdfDoc.embedJpg(buffer);
    } catch {
      // Fall through to canvas re-encode if non-standard JPEG
    }
  } else if (isPng) {
    try {
      const buffer = await file.arrayBuffer();
      return await pdfDoc.embedPng(buffer);
    } catch {
      // Fall through to canvas re-encode
    }
  }

  // Universal canvas fallback for WebP, GIF, or complex image profiles
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create 2D canvas context for image conversion.');

  ctx.drawImage(img, 0, 0);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92)
  );

  if (!blob) throw new Error(`Could not convert image "${file.name}" to JPEG.`);
  const buffer = await blob.arrayBuffer();
  return await pdfDoc.embedJpg(buffer);
}

/**
 * Compiles a list of image files into a single multi-page PDF document.
 * 
 * @param files Ordered array of image files.
 * @param options Page layout options (size, orientation, margins).
 * @param onProgress Optional progress callback.
 * @returns Uint8Array of the compiled PDF.
 */
export async function imagesToPdf(
  files: File[],
  options: ImagePdfOptions,
  onProgress?: (progress: ImagePdfProgress) => void
): Promise<Uint8Array> {
  if (files.length === 0) {
    throw new Error('Please select at least one image file.');
  }

  const totalBytes = files.reduce((acc, f) => acc + f.size, 0);
  if (totalBytes > MAX_FILE_SIZE_BYTES) {
    throw new Error('Total image size exceeds the 100MB limit.');
  }

  onProgress?.({ message: 'Initializing PDF document...', percent: 10 });
  const pdfDoc = await PDFDocument.create();
  const marginPt = MARGIN_SIZES[options.margin] ?? 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const stepPercent = 15 + Math.round(((i + 1) / files.length) * 70);
    onProgress?.({ message: `Processing image ${i + 1} of ${files.length} (${file.name})...`, percent: stepPercent });

    const img = await loadImageElement(file);
    const imgWidth = img.naturalWidth || img.width;
    const imgHeight = img.naturalHeight || img.height;
    const embeddedImage = await getEmbeddedImage(pdfDoc, file, img);

    let pageWidth = 0;
    let pageHeight = 0;
    let drawX = marginPt;
    let drawY = marginPt;
    let drawWidth = 0;
    let drawHeight = 0;

    if (options.pageSize === 'fit') {
      pageWidth = imgWidth + marginPt * 2;
      pageHeight = imgHeight + marginPt * 2;
      drawWidth = imgWidth;
      drawHeight = imgHeight;
    } else {
      // Standard page size (A4 or Letter)
      const baseSize = PAGE_SIZES[options.pageSize];
      let isLandscape = false;
      if (options.orientation === 'landscape') {
        isLandscape = true;
      } else if (options.orientation === 'auto') {
        isLandscape = imgWidth > imgHeight;
      }

      pageWidth = isLandscape ? baseSize.height : baseSize.width;
      pageHeight = isLandscape ? baseSize.width : baseSize.height;

      const availWidth = Math.max(10, pageWidth - marginPt * 2);
      const availHeight = Math.max(10, pageHeight - marginPt * 2);

      const widthScale = availWidth / imgWidth;
      const heightScale = availHeight / imgHeight;
      const scale = Math.min(widthScale, heightScale);

      drawWidth = imgWidth * scale;
      drawHeight = imgHeight * scale;

      // Center within printable area
      drawX = marginPt + (availWidth - drawWidth) / 2;
      drawY = marginPt + (availHeight - drawHeight) / 2;
    }

    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    page.drawImage(embeddedImage, {
      x: drawX,
      y: drawY,
      width: drawWidth,
      height: drawHeight,
    });
  }

  onProgress?.({ message: 'Compiling PDF document...', percent: 90 });
  const resultBytes = await pdfDoc.save();

  onProgress?.({ message: 'Conversion complete!', percent: 100 });
  return resultBytes;
}
