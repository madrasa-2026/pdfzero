import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import { MAX_FILE_SIZE_BYTES } from './merge';

export type CompressionLevel = 'extreme' | 'recommended' | 'light';

export interface CompressionProgress {
  message: string;
  percent: number;
}

export interface CompressionResult {
  bytes: Uint8Array;
  originalSize: number;
  compressedSize: number;
  savedPercentage: number;
}

const PRESETS: Record<CompressionLevel, { scale: number; quality: number }> = {
  extreme: { scale: 0.9, quality: 0.45 },
  recommended: { scale: 1.2, quality: 0.65 },
  light: { scale: 1.5, quality: 0.82 },
};

/**
 * Compresses a PDF file client-side by rendering each page to an offscreen canvas
 * and recompiling optimized raster images into a fresh PDF document.
 */
export async function compressPdfFile(
  file: File,
  level: CompressionLevel = 'recommended',
  onProgress?: (progress: CompressionProgress) => void
): Promise<CompressionResult> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `The file "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the 100MB browser limit.`
    );
  }

  // Ensure PDF.js worker is pointed to our local static copy
  if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  }

  onProgress?.({ message: 'Reading document into browser memory...', percent: 5 });
  const arrayBuffer = await file.arrayBuffer();

  let loadingTask;
  try {
    loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true,
    });
  } catch (err: any) {
    throw new Error(`Failed to initialize PDF parser: ${err.message}`);
  }

  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  if (numPages === 0) {
    throw new Error('This PDF has no readable pages.');
  }

  const preset = PRESETS[level] || PRESETS.recommended;
  const newPdf = await PDFDocument.create();

  for (let i = 1; i <= numPages; i++) {
    const pagePercentBase = 10 + Math.floor(((i - 1) / numPages) * 75);
    onProgress?.({
      message: `Rendering page ${i} of ${numPages}...`,
      percent: pagePercentBase,
    });

    const page = await pdf.getPage(i);
    const unscaledViewport = page.getViewport({ scale: 1.0 });
    const renderViewport = page.getViewport({ scale: preset.scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(renderViewport.width));
    canvas.height = Math.max(1, Math.floor(renderViewport.height));

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Could not obtain canvas 2D rendering context.');

    // White background in case page has transparent areas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport: renderViewport,
    }).promise;

    onProgress?.({
      message: `Compressing image for page ${i} of ${numPages}...`,
      percent: pagePercentBase + Math.floor((1 / numPages) * 40),
    });

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error(`Failed to generate compressed image for page ${i}`));
        },
        'image/jpeg',
        preset.quality
      );
    });

    const imgBytes = await blob.arrayBuffer();
    const embeddedImg = await newPdf.embedJpg(imgBytes);

    const newPage = newPdf.addPage([unscaledViewport.width, unscaledViewport.height]);
    newPage.drawImage(embeddedImg, {
      x: 0,
      y: 0,
      width: unscaledViewport.width,
      height: unscaledViewport.height,
    });
  }

  onProgress?.({ message: 'Saving compressed PDF document...', percent: 90 });
  const compressedBytes = await newPdf.save();

  const originalSize = file.size;
  const compressedSize = compressedBytes.byteLength;
  const savedPercentage = Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100));

  onProgress?.({ message: 'Compression complete!', percent: 100 });

  return {
    bytes: compressedBytes,
    originalSize,
    compressedSize,
    savedPercentage,
  };
}
