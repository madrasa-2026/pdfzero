import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';
import { MAX_FILE_SIZE_BYTES } from './merge';

if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

export type ImageOutputFormat = 'jpeg' | 'png';
export type ImageQuality = 'standard' | 'high';

export interface PdfToImageOptions {
  format: ImageOutputFormat;
  quality: ImageQuality;
}

export interface ConvertProgress {
  message: string;
  percent: number;
}

export interface ConvertResult {
  blob: Blob;
  filename: string;
  mimeType: string;
  isZip: boolean;
  pageCount: number;
}

/**
 * Converts all pages of a PDF document into JPG or PNG image files.
 * If 1 page, returns the image directly. If >1 pages, packages into a ZIP.
 * 
 * @param file The PDF File object to convert.
 * @param options Format and quality options.
 * @param onProgress Optional progress callback.
 * @returns ConvertResult with file blob and filename.
 */
export async function convertPdfToImages(
  file: File,
  options: PdfToImageOptions,
  onProgress?: (progress: ConvertProgress) => void
): Promise<ConvertResult> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('File exceeds the 100MB limit.');
  }

  onProgress?.({ message: 'Loading PDF document...', percent: 10 });
  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;

  if (totalPages === 0) {
    throw new Error('The PDF document contains no pages.');
  }

  const baseName = file.name.replace(/\.[^/.]+$/, '');
  const ext = options.format === 'jpeg' ? 'jpg' : 'png';
  const mimeType = options.format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const scale = options.quality === 'high' ? 2.5 : 1.5;
  const jpegQuality = options.quality === 'high' ? 0.95 : 0.85;

  const pageBlobs: { name: string; blob: Blob }[] = [];

  for (let i = 1; i <= totalPages; i++) {
    const renderPercent = 15 + Math.round(((i - 1) / totalPages) * 70);
    onProgress?.({ message: `Rendering page ${i} of ${totalPages}...`, percent: renderPercent });

    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');

    if (!ctx) throw new Error('Could not initialize canvas rendering context.');

    await page.render({ canvasContext: ctx, viewport }).promise;

    const pageBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error(`Failed to encode page ${i} to ${options.format}`));
        },
        mimeType,
        jpegQuality
      );
    });

    pageBlobs.push({
      name: `page-${i}.${ext}`,
      blob: pageBlob,
    });
  }

  // Single-page PDF: download directly as image
  if (totalPages === 1) {
    onProgress?.({ message: 'Image conversion complete!', percent: 100 });
    return {
      blob: pageBlobs[0].blob,
      filename: `${baseName}-page-1.${ext}`,
      mimeType,
      isZip: false,
      pageCount: 1,
    };
  }

  // Multi-page PDF: compile into ZIP
  onProgress?.({ message: 'Packaging pages into ZIP archive...', percent: 90 });
  const zip = new JSZip();
  pageBlobs.forEach((item) => {
    zip.file(item.name, item.blob);
  });

  const zipBlob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      const zipPercent = 90 + Math.round(metadata.percent * 0.1);
      onProgress?.({ message: 'Compressing ZIP archive...', percent: Math.min(99, zipPercent) });
    }
  );

  onProgress?.({ message: 'Conversion and packaging complete!', percent: 100 });
  return {
    blob: zipBlob,
    filename: `${baseName}-images.zip`,
    mimeType: 'application/zip',
    isZip: true,
    pageCount: totalPages,
  };
}
