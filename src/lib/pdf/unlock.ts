import { PDFDocument } from 'pdf-lib-with-encrypt';
import { MAX_FILE_SIZE_BYTES } from './merge';

export interface UnlockProgress {
  message: string;
  percent: number;
}

export interface EncryptionStatus {
  isEncrypted: boolean;
  pageCount?: number;
}

/**
 * Probes a PDF file to detect if it requires a password.
 * 
 * @param file The PDF File object.
 * @returns EncryptionStatus indicating if the document is encrypted.
 */
export async function checkIfEncrypted(file: File): Promise<EncryptionStatus> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('File exceeds the 100MB limit.');
  }

  const arrayBuffer = await file.arrayBuffer();
  try {
    const doc = await PDFDocument.load(arrayBuffer);
    return {
      isEncrypted: false,
      pageCount: doc.getPageCount(),
    };
  } catch (err: any) {
    const msg = (err?.message || '').toLowerCase();
    if (msg.includes('encrypted') || msg.includes('password')) {
      return { isEncrypted: true };
    }
    // If it's another parsing error, rethrow
    throw err;
  }
}

/**
 * Unlocks a password-protected PDF document client-side and produces
 * a clean, unencrypted version with all restrictions removed.
 * 
 * @param file The encrypted PDF File object.
 * @param password The open or master password for the document.
 * @param onProgress Optional progress callback.
 * @returns Uint8Array of the clean, unencrypted PDF.
 */
export async function unlockPdf(
  file: File,
  password: string,
  onProgress?: (progress: UnlockProgress) => void
): Promise<Uint8Array> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('File exceeds the 100MB limit.');
  }

  const trimmedPassword = password ?? '';
  if (!trimmedPassword) {
    throw new Error('Please enter the document password.');
  }

  onProgress?.({ message: 'Reading document bytes...', percent: 15 });
  const arrayBuffer = await file.arrayBuffer();

  onProgress?.({ message: 'Verifying password and decrypting...', percent: 40 });
  let sourceDoc: PDFDocument;
  try {
    sourceDoc = await PDFDocument.load(arrayBuffer, { password: trimmedPassword });
  } catch (err: any) {
    const msg = err?.message || '';
    if (msg.toLowerCase().includes('incorrect') || msg.toLowerCase().includes('password')) {
      throw new Error('Incorrect password. Please verify the password and try again.');
    }
    throw new Error(`Unable to decrypt document: ${msg || 'Decryption failed'}`);
  }

  onProgress?.({ message: 'Removing encryption and rebuilding clean pages...', percent: 70 });
  const cleanDoc = await PDFDocument.create();
  const pageIndices = sourceDoc.getPageIndices();
  const copiedPages = await cleanDoc.copyPages(sourceDoc, pageIndices);

  for (const page of copiedPages) {
    cleanDoc.addPage(page);
  }

  // Copy document metadata if present
  try {
    const title = sourceDoc.getTitle();
    if (title) cleanDoc.setTitle(title);

    const author = sourceDoc.getAuthor();
    if (author) cleanDoc.setAuthor(author);

    const subject = sourceDoc.getSubject();
    if (subject) cleanDoc.setSubject(subject);

    const keywords = sourceDoc.getKeywords();
    if (keywords) cleanDoc.setKeywords(keywords);
  } catch {
    // Non-critical metadata copy failure
  }

  onProgress?.({ message: 'Encoding clean unencrypted PDF file...', percent: 90 });
  const cleanBytes = await cleanDoc.save();

  onProgress?.({ message: 'PDF unlocked successfully!', percent: 100 });
  return cleanBytes;
}
