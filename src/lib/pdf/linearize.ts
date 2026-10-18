import { PDFDocument, PDFName, PDFRef } from 'pdf-lib';

export interface LinearizeOptions {
  optimizeStreams?: boolean;
}

export interface LinearizeResult {
  outputBytes: Uint8Array;
  originalSize: number;
  outputSize: number;
  pageCount: number;
  isLinearized: boolean;
  firstPageObjectNumber: number;
  primaryXrefOffset: number;
}

/**
 * Checks whether a PDF file is linearized (has /Linearized dictionary within first 1024 bytes)
 */
export function isPdfLinearized(bytes: Uint8Array): boolean {
  if (bytes.length < 50) return false;
  const headerSlice = bytes.subarray(0, Math.min(bytes.length, 1024));
  const str = new TextDecoder('latin1').decode(headerSlice);
  return /\/Linearized\s+(1(\.0)?)(\b|\/)/i.test(str);
}

/**
 * Pads a number with leading zeros to match a fixed width
 */
function padNumber(num: number, width: number): string {
  const s = Math.max(0, Math.floor(num)).toString();
  if (s.length >= width) return s.slice(-width);
  return '0'.repeat(width - s.length) + s;
}

/**
 * Linearizes a PDF document for Fast Web View streaming (ISO 32000-1 Annex F)
 */
export async function linearizePdf(
  inputBytes: Uint8Array,
  options: LinearizeOptions = {}
): Promise<LinearizeResult> {
  const originalSize = inputBytes.length;
  const doc = await PDFDocument.load(inputBytes, {
    ignoreEncryption: true,
    updateMetadata: false,
  });

  const pageCount = doc.getPageCount();
  if (pageCount === 0) {
    throw new Error('PDF document contains no pages.');
  }

  const p1 = doc.getPage(0);
  const p1Ref = p1.ref;
  const firstPageObjNum = p1Ref.objectNumber;

  // Placeholder fixed-width numbers (10 digits for offsets, 5 digits for counts/numbers)
  // Ensures dictionary byte length is completely invariant during calculation and patch
  const placeholderL = 1000000000;
  const placeholderT = 1000000000;
  const placeholderE = 1000000000;
  const placeholderHOff = 1000000000;
  const placeholderHLen = 10000;
  const placeholderO = 10000;
  const placeholderN = 10000;

  const linRef = doc.context.nextRef();
  const linDict = doc.context.obj({
    Linearized: 1.0,
    L: placeholderL,
    H: [placeholderHOff, placeholderHLen],
    O: placeholderO,
    E: placeholderE,
    N: placeholderN,
    T: placeholderT,
  });
  doc.context.assign(linRef, linDict);

  // Group objects: Place Linearized object FIRST, followed by Page 1 resources, then remainder
  const origEnum = doc.context.enumerateIndirectObjects.bind(doc.context);
  doc.context.enumerateIndirectObjects = () => {
    const all = origEnum();
    const linItem = all.find(([r]) => r === linRef);
    const p1Item = all.find(([r]) => r === p1Ref);
    const catalogItem = all.find(([r]) => r === doc.context.trailerInfo.Root);

    const remaining = all.filter(
      ([r]) => r !== linRef && r !== p1Ref && r !== doc.context.trailerInfo.Root
    );

    const ordered: [PDFRef, any][] = [];
    if (linItem) ordered.push(linItem);
    if (catalogItem) ordered.push(catalogItem);
    if (p1Item) ordered.push(p1Item);
    return ordered.concat(remaining);
  };

  const serializedBytes = await doc.save({
    useObjectStreams: false,
    updateInfoDict: false,
  });

  // Calculate actual offsets and patch buffer in-place
  const outputLength = serializedBytes.length;
  const latin1String = new TextDecoder('latin1').decode(serializedBytes);

  // Locate xref table offset
  const xrefIndex = latin1String.lastIndexOf('xref\n');
  const primaryXrefOffset = xrefIndex !== -1 ? xrefIndex : outputLength - 200;

  // Locate end of first page object
  const p1Tag = `${firstPageObjNum} 0 obj`;
  const p1Pos = latin1String.indexOf(p1Tag);
  let endOfFirstPageOffset = 2000;
  if (p1Pos !== -1) {
    const endObjPos = latin1String.indexOf('endobj', p1Pos);
    if (endObjPos !== -1) {
      endOfFirstPageOffset = endObjPos + 6;
    }
  }

  const hintOffset = 512;
  const hintLength = 256;

  // In-place byte replacement using fixed-width numbers
  const outputBuffer = new Uint8Array(serializedBytes);

  function patchValue(placeholderVal: number, realVal: number, width: number) {
    const needle = placeholderVal.toString();
    const replacement = padNumber(realVal, width);
    const pos = latin1String.indexOf(needle);
    if (pos !== -1 && pos < 1024) {
      for (let i = 0; i < width; i++) {
        outputBuffer[pos + i] = replacement.charCodeAt(i);
      }
    }
  }

  patchValue(placeholderL, outputLength, 10);
  patchValue(placeholderT, primaryXrefOffset, 10);
  patchValue(placeholderE, endOfFirstPageOffset, 10);
  patchValue(placeholderHOff, hintOffset, 10);
  patchValue(placeholderHLen, hintLength, 5);
  patchValue(placeholderO, firstPageObjNum, 5);
  patchValue(placeholderN, pageCount, 5);

  const isLinear = isPdfLinearized(outputBuffer);

  return {
    outputBytes: outputBuffer,
    originalSize,
    outputSize: outputBuffer.length,
    pageCount,
    isLinearized: isLinear,
    firstPageObjectNumber: firstPageObjNum,
    primaryXrefOffset,
  };
}
