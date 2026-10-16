import * as pako from 'pako';
import { PDFDocument } from 'pdf-lib-with-encrypt';

// Ensure pako exports are bridged across Node ESM / CJS module bundlers
if (pako && !(pako as any).deflate && (pako as any).default?.deflate) {
  Object.assign(pako, (pako as any).default);
}

export interface BatchTestResult {
  found: boolean;
  password: string | null;
  testedCount: number;
}

/**
 * Tests whether a single candidate password successfully decrypts the PDF document.
 * 
 * @param pdfBytes Uint8Array or ArrayBuffer containing encrypted PDF.
 * @param candidate Password string to test.
 * @returns boolean true if the password is valid, false otherwise.
 */
export async function testCandidatePassword(
  pdfBytes: Uint8Array | ArrayBuffer,
  candidate: string
): Promise<boolean> {
  try {
    const doc = await PDFDocument.load(pdfBytes, { password: candidate });
    return doc.getPageCount() > 0;
  } catch {
    return false;
  }
}

/**
 * Tests a batch of candidate passwords sequentially.
 * Immediately halts and returns if a matching password is found.
 * 
 * @param pdfBytes Encrypted PDF bytes.
 * @param candidates Array of candidate passwords to test.
 * @param onProgress Optional progress callback after each candidate.
 */
export async function testPasswordBatch(
  pdfBytes: Uint8Array | ArrayBuffer,
  candidates: string[],
  onProgress?: (tested: number, current: string) => void
): Promise<BatchTestResult> {
  let tested = 0;
  for (const candidate of candidates) {
    tested++;
    onProgress?.(tested, candidate);
    const isValid = await testCandidatePassword(pdfBytes, candidate);
    if (isValid) {
      return {
        found: true,
        password: candidate,
        testedCount: tested,
      };
    }
  }

  return {
    found: false,
    password: null,
    testedCount: tested,
  };
}
