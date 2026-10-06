import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';
import { MAX_FILE_SIZE_BYTES } from './merge';

if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

export interface WordConvertProgress {
  message: string;
  percent: number;
}

export interface WordConvertOptions {
  preservePageBreaks?: boolean;
}

interface TextItem {
  str: string;
  x: number;
  y: number;
  height: number;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildDocumentXml(pageParagraphs: string[][], preservePageBreaks: boolean): string {
  let bodyXml = '';

  pageParagraphs.forEach((paragraphs, pageIndex) => {
    // Add page break before subsequent pages
    if (pageIndex > 0 && preservePageBreaks) {
      bodyXml += '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
    }

    if (paragraphs.length === 0) {
      bodyXml += '<w:p/>';
    } else {
      paragraphs.forEach((text) => {
        const escaped = escapeXml(text);
        bodyXml += `<w:p><w:r><w:t xml:space="preserve">${escaped}</w:t></w:r></w:p>`;
      });
    }
  });

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${bodyXml}
    <w:sectPr/>
  </w:body>
</w:document>`;
}

/**
 * Extracts text and paragraphs from PDF pages and packages into an editable .docx file.
 * 
 * @param file The PDF File object.
 * @param options Conversion options.
 * @param onProgress Optional progress callback.
 * @returns Blob of the .docx file and default filename.
 */
export async function convertPdfToWord(
  file: File,
  options: WordConvertOptions = { preservePageBreaks: true },
  onProgress?: (progress: WordConvertProgress) => void
): Promise<{ blob: Blob; filename: string }> {
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
  const pageParagraphs: string[][] = [];

  for (let i = 1; i <= totalPages; i++) {
    const parsePercent = 15 + Math.round(((i - 1) / totalPages) * 70);
    onProgress?.({ message: `Extracting text from page ${i} of ${totalPages}...`, percent: parsePercent });

    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    const items: TextItem[] = [];
    for (const item of textContent.items) {
      if ('str' in item && item.str.trim().length > 0) {
        items.push({
          str: item.str,
          x: item.transform[4],
          y: item.transform[5],
          height: Math.abs(item.transform[3]) || 12,
        });
      }
    }

    // Sort items top-to-bottom (y descending), then left-to-right (x ascending)
    items.sort((a, b) => {
      const yDiff = b.y - a.y;
      if (Math.abs(yDiff) > 4) return yDiff;
      return a.x - b.x;
    });

    // Group text items into lines and paragraphs
    const paragraphs: string[] = [];
    let currentParagraphLines: string[] = [];
    let lastY: number | null = null;
    let currentLine: string[] = [];

    for (let j = 0; j < items.length; j++) {
      const it = items[j];

      if (lastY === null) {
        currentLine.push(it.str);
        lastY = it.y;
      } else {
        const deltaY = lastY - it.y; // Positive if moving downwards

        if (Math.abs(deltaY) <= 4) {
          // Same line
          currentLine.push(it.str);
        } else {
          // New line
          currentParagraphLines.push(currentLine.join(' '));
          currentLine = [it.str];

          // If gap between lines is significantly larger than line height, start new paragraph
          if (deltaY > it.height * 1.8) {
            paragraphs.push(currentParagraphLines.join(' '));
            currentParagraphLines = [];
          }
          lastY = it.y;
        }
      }
    }

    if (currentLine.length > 0) {
      currentParagraphLines.push(currentLine.join(' '));
    }
    if (currentParagraphLines.length > 0) {
      paragraphs.push(currentParagraphLines.join(' '));
    }

    pageParagraphs.push(paragraphs);
  }

  onProgress?.({ message: 'Compiling OpenXML Microsoft Word document...', percent: 88 });

  const zip = new JSZip();

  // 1. [Content_Types].xml
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
  );

  // 2. _rels/.rels
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );

  // 3. word/_rels/document.xml.rels
  zip.file(
    'word/_rels/document.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`
  );

  // 4. word/document.xml
  zip.file('word/document.xml', buildDocumentXml(pageParagraphs, options.preservePageBreaks ?? true));

  const docxBlob = await zip.generateAsync(
    {
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (meta) => {
      const percent = 88 + Math.round(meta.percent * 0.12);
      onProgress?.({ message: 'Finalizing .docx file...', percent: Math.min(99, percent) });
    }
  );

  onProgress?.({ message: 'Conversion complete!', percent: 100 });

  return {
    blob: docxBlob,
    filename: `${baseName}.docx`,
  };
}
