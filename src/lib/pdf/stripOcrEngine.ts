import {
  PDFDocument,
  PDFName,
  PDFArray,
  PDFRawStream,
  decodePDFRawStream
} from 'pdf-lib';

export interface StripOcrOptions {
  mode?: 'invisible-only' | 'all-text'; // default: 'invisible-only'
  cleanMetadata?: boolean;             // default: true
}

export interface StripOcrResult {
  pdfBytes: Uint8Array;
  pagesProcessed: number;
  invisibleBlocksRemoved: number;
  originalSizeBytes: number;
  cleanedSizeBytes: number;
}

/**
 * Strips invisible OCR text layers (3 Tr) or all text blocks (BT ... ET)
 * directly from PDF content streams without rasterization.
 */
export async function stripOcrLayer(
  pdfBytes: Uint8Array,
  options: StripOcrOptions = {}
): Promise<StripOcrResult> {
  const mode = options.mode ?? 'invisible-only';
  const cleanMetadata = options.cleanMetadata ?? true;

  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const pages = doc.getPages();
  let totalInvisibleBlocksRemoved = 0;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const contentsRef = page.node.get(PDFName.of('Contents'));
    if (!contentsRef) continue;

    // A page's /Contents can be a single stream or an array of streams
    const streamRefs: any[] = [];
    if (contentsRef instanceof PDFArray) {
      for (let j = 0; j < contentsRef.size(); j++) {
        streamRefs.push(contentsRef.get(j));
      }
    } else {
      streamRefs.push(contentsRef);
    }

    const newStreamRefs: any[] = [];

    for (const sRef of streamRefs) {
      try {
        const streamObj = doc.context.lookup(sRef);
        if (!(streamObj instanceof PDFRawStream)) {
          newStreamRefs.push(sRef);
          continue;
        }

        const decodedBytes = decodePDFRawStream(streamObj).getBytes();
        const contentStr = new TextDecoder('latin1').decode(decodedBytes);

        let modifiedStr = contentStr;
        let modified = false;

        if (mode === 'invisible-only') {
          // Identify text blocks BT ... ET that contain "3 Tr" (invisible render mode)
          // or render mode 3 regex
          const btEtRegex = /BT[\s\S]*?ET/g;
          modifiedStr = contentStr.replace(btEtRegex, (block) => {
            // Check if block sets rendering mode to 3 (invisible text)
            // Operators: "3 Tr", "3.0 Tr", "3  Tr"
            if (/\b3(?:\.0+)?\s+Tr\b/.test(block)) {
              totalInvisibleBlocksRemoved++;
              modified = true;
              return ''; // Strip invisible block
            }
            return block;
          });
        } else if (mode === 'all-text') {
          // Strip all BT ... ET blocks completely
          const btEtRegex = /BT[\s\S]*?ET/g;
          modifiedStr = contentStr.replace(btEtRegex, () => {
            totalInvisibleBlocksRemoved++;
            modified = true;
            return '';
          });
        }

        if (modified) {
          const newBytes = new TextEncoder().encode(modifiedStr);
          const newStream = doc.context.flateStream(newBytes);
          const newRef = doc.context.register(newStream);
          newStreamRefs.push(newRef);
        } else {
          newStreamRefs.push(sRef);
        }
      } catch (err) {
        console.warn(`Could not process content stream on page ${i + 1}:`, err);
        newStreamRefs.push(sRef);
      }
    }

    // Update page /Contents
    if (newStreamRefs.length === 1) {
      page.node.set(PDFName.of('Contents'), newStreamRefs[0]);
    } else if (newStreamRefs.length > 1) {
      const arr = doc.context.obj(newStreamRefs);
      page.node.set(PDFName.of('Contents'), arr);
    }
  }

  if (cleanMetadata) {
    try {
      doc.setCreator('AirPDF (Cleaned Vector Engine)');
      doc.setProducer('AirPDF Clean Engine');
    } catch {
      // ignore
    }
  }

  const cleanedBytes = await doc.save();

  return {
    pdfBytes: cleanedBytes,
    pagesProcessed: pages.length,
    invisibleBlocksRemoved: totalInvisibleBlocksRemoved,
    originalSizeBytes: pdfBytes.length,
    cleanedSizeBytes: cleanedBytes.length
  };
}
