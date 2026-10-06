import { PDFDocument } from 'pdf-lib-with-encrypt';
import { MAX_FILE_SIZE_BYTES } from './merge';

export interface ProtectProgress {
  message: string;
  percent: number;
}

/**
 * Encrypts a PDF document with standard password protection using client-side encryption.
 * 
 * @param file The unencrypted PDF File object.
 * @param userPassword The password required to open and read the document.
 * @param ownerPassword Optional master password for permissions.
 * @param onProgress Optional progress callback.
 * @returns Uint8Array of the encrypted PDF bytes.
 */
export async function protectPdf(
  file: File,
  userPassword: string,
  ownerPassword?: string,
  onProgress?: (progress: ProtectProgress) => void
): Promise<Uint8Array> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('File exceeds the 100MB limit.');
  }

  if (!userPassword || userPassword.length === 0) {
    throw new Error('Please enter a password.');
  }

  onProgress?.({ message: 'Loading PDF document into memory...', percent: 15 });
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);

  onProgress?.({ message: 'Applying cryptographic encryption...', percent: 45 });
  pdfDoc.encrypt({
    userPassword: userPassword,
    ownerPassword: ownerPassword || userPassword + '_owner',
  });

  onProgress?.({ message: 'Encoding encrypted PDF file...', percent: 85 });
  const encryptedBytes = await pdfDoc.save();

  onProgress?.({ message: 'Protection complete!', percent: 100 });
  return encryptedBytes;
}
