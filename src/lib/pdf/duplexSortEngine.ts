import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';

export interface DuplexSplitOptions {
  reverseEvenStack?: boolean; // Default true: standard desktop output trays deliver face-down
  padOddPageCount?: boolean;  // Default true: appends blank page so odd sheets align
}

export interface DuplexSplitResult {
  step1OddBytes: Uint8Array;
  step2EvenBytes: Uint8Array;
  totalOriginalPages: number;
  oddPagesCount: number;
  evenPagesCount: number;
  wasPadded: boolean;
  reverseEvenStack: boolean;
}

export interface InterleaveOptions {
  reverseSecondStack?: boolean; // Default true: ADF scanners invert back sides
}

/**
 * Splits a PDF into two stacks calibrated for manual duplex printing.
 */
export async function splitForManualDuplex(
  pdfBytes: Uint8Array,
  options: DuplexSplitOptions = {}
): Promise<DuplexSplitResult> {
  const reverseEvenStack = options.reverseEvenStack ?? true;
  const padOddPageCount = options.padOddPageCount ?? true;

  const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const totalOriginalPages = srcDoc.getPageCount();

  const oddIndices: number[] = [];
  const evenIndices: number[] = [];

  for (let i = 0; i < totalOriginalPages; i++) {
    if (i % 2 === 0) {
      oddIndices.push(i);
    } else {
      evenIndices.push(i);
    }
  }

  // 1. Create Step 1 (Odd / Fronts) Document
  const oddDoc = await PDFDocument.create();
  if (oddIndices.length > 0) {
    const copiedOdds = await oddDoc.copyPages(srcDoc, oddIndices);
    copiedOdds.forEach(p => oddDoc.addPage(p));
  }

  // 2. Create Step 2 (Even / Backs) Document
  const evenDoc = await PDFDocument.create();
  const wasPadded = padOddPageCount && totalOriginalPages % 2 !== 0;

  // Last page dimensions for blank padding
  const lastPageSize = srcDoc.getPage(Math.max(0, totalOriginalPages - 1)).getSize();

  if (reverseEvenStack) {
    // When output is reversed (face-down trays), the last sheet is on top.
    // If padded, the blank back belongs to the last odd sheet, so it feeds first!
    if (wasPadded) {
      evenDoc.addPage([lastPageSize.width, lastPageSize.height]);
    }
    const reversedEvens = [...evenIndices].reverse();
    if (reversedEvens.length > 0) {
      const copiedEvens = await evenDoc.copyPages(srcDoc, reversedEvens);
      copiedEvens.forEach(p => evenDoc.addPage(p));
    }
  } else {
    // Normal forward feed
    if (evenIndices.length > 0) {
      const copiedEvens = await evenDoc.copyPages(srcDoc, evenIndices);
      copiedEvens.forEach(p => evenDoc.addPage(p));
    }
    if (wasPadded) {
      evenDoc.addPage([lastPageSize.width, lastPageSize.height]);
    }
  }

  const step1OddBytes = await oddDoc.save();
  const step2EvenBytes = await evenDoc.save();

  return {
    step1OddBytes,
    step2EvenBytes,
    totalOriginalPages,
    oddPagesCount: oddDoc.getPageCount(),
    evenPagesCount: evenDoc.getPageCount(),
    wasPadded,
    reverseEvenStack
  };
}

/**
 * Re-weaves two separate scanned documents (Fronts & Backs) into a unified sequential PDF.
 */
export async function interleavePdfStreams(
  frontBytes: Uint8Array,
  backBytes: Uint8Array,
  options: InterleaveOptions = {}
): Promise<Uint8Array> {
  const reverseSecondStack = options.reverseSecondStack ?? true;

  const frontDoc = await PDFDocument.load(frontBytes, { ignoreEncryption: true });
  const backDoc = await PDFDocument.load(backBytes, { ignoreEncryption: true });
  const outDoc = await PDFDocument.create();

  const frontCount = frontDoc.getPageCount();
  const backCount = backDoc.getPageCount();
  const maxIterations = Math.max(frontCount, backCount);

  for (let i = 0; i < maxIterations; i++) {
    // Add Front page i
    if (i < frontCount) {
      const [copiedFront] = await outDoc.copyPages(frontDoc, [i]);
      outDoc.addPage(copiedFront);
    }

    // Add Back page
    const backIdx = reverseSecondStack ? (backCount - 1 - i) : i;
    if (backIdx >= 0 && backIdx < backCount) {
      const [copiedBack] = await outDoc.copyPages(backDoc, [backIdx]);
      outDoc.addPage(copiedBack);
    }
  }

  return await outDoc.save();
}

/**
 * Bundles Step 1, Step 2, and step-by-step printing instructions into a ZIP archive.
 */
export async function bundleDuplexZip(
  result: DuplexSplitResult,
  originalName: string = 'document.pdf'
): Promise<Uint8Array> {
  const zip = new JSZip();
  const baseName = originalName.replace(/\.pdf$/i, '');

  zip.file(`${baseName}_Step1_FRONTS.pdf`, result.step1OddBytes);
  zip.file(`${baseName}_Step2_BACKS.pdf`, result.step2EvenBytes);

  let instructions = `MANUAL DUPLEX PRINTING INSTRUCTIONS\n`;
  instructions += `Document: ${originalName}\n`;
  instructions += `Total Pages: ${result.totalOriginalPages} (${result.oddPagesCount} physical paper sheets needed)\n`;
  if (result.wasPadded) {
    instructions += `Blank Page Padding: Added 1 blank back page to keep odd final page aligned.\n`;
  }
  instructions += `Even Stack Reversal: ${result.reverseEvenStack ? 'Reversed (Ready for standard face-down output tray)' : 'Normal Forward'}\n\n`;
  instructions += `------------------------------------------------------------\n`;
  instructions += `STEP 1: Print "${baseName}_Step1_FRONTS.pdf"\n`;
  instructions += `  - Load fresh paper into your printer tray.\n`;
  instructions += `  - Print all pages from this file.\n\n`;
  instructions += `STEP 2: Reload the Printed Stack\n`;
  instructions += `  - Take the printed stack directly from the output tray.\n`;
  instructions += `  - Do NOT change the order of the sheets.\n`;
  instructions += `  - Place the stack back into your paper tray so side 2 is printed.\n\n`;
  instructions += `STEP 3: Print "${baseName}_Step2_BACKS.pdf"\n`;
  instructions += `  - Print all pages from this file.\n`;
  instructions += `  - Your document is now complete and perfectly double-sided!\n`;

  zip.file(`PRINTING_INSTRUCTIONS.txt`, instructions);

  return await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}
