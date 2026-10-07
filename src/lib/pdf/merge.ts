import { PDFDocument } from 'pdf-lib';

export interface MergeProgress {
  message: string;
  percent: number;
}

export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB

/**
 * Merges multiple PDF files client-side using pdf-lib.
 * 
 * @param files Array of PDF File objects in the desired sequence.
 * @param onProgress Optional callback reporting percentage and current phase.
 * @returns Uint8Array of the merged PDF document bytes.
 */
export async function mergePdfFiles(
  files: File[],
  onProgress?: (progress: MergeProgress) => void
): Promise<Uint8Array> {
  if (!files || files.length < 2) {
    throw new Error('Please select at least 2 PDF files to merge.');
  }

  // Validate file sizes
  for (const file of files) {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(
        `The file "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the 100MB limit. Please choose files under 100MB.`
      );
    }
  }

  onProgress?.({ message: 'Initializing PDF document...', percent: 5 });
  const mergedPdf = await PDFDocument.create();

  const totalFiles = files.length;
  for (let i = 0; i < totalFiles; i++) {
    const file = files[i];
    const fileProgressBase = 10 + Math.floor((i / totalFiles) * 75);

    onProgress?.({
      message: `Reading document ${i + 1} of ${totalFiles}: ${file.name}...`,
      percent: fileProgressBase,
    });

    const arrayBuffer = await file.arrayBuffer();
    
    let sourcePdf: PDFDocument;
    try {
      sourcePdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: false });
    } catch (err: any) {
      if (err.message && err.message.toLowerCase().includes('encrypt')) {
        throw new Error(`The file "${file.name}" is password-protected. Please unlock it before merging.`);
      }
      throw new Error(`Unable to read "${file.name}". The PDF may be corrupted or invalid.`);
    }

    const pageIndices = sourcePdf.getPageIndices();
    onProgress?.({
      message: `Copying ${pageIndices.length} ${pageIndices.length === 1 ? 'page' : 'pages'} from "${file.name}"...`,
      percent: fileProgressBase + Math.floor((1 / totalFiles) * 35),
    });

    const copiedPages = await mergedPdf.copyPages(sourcePdf, pageIndices);
    for (const page of copiedPages) {
      mergedPdf.addPage(page);
    }
  }

  onProgress?.({ message: 'Optimizing and building final PDF...', percent: 90 });
  const mergedPdfBytes = await mergedPdf.save();

  onProgress?.({ message: 'Merge complete!', percent: 100 });
  return mergedPdfBytes;
}
