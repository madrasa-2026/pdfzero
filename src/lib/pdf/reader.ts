export interface ReaderSentence {
  id: string;
  sentenceIndex: number; // 0-based sequential across entire document
  pageNumber: number; // 1-based page index
  text: string;
}

export interface PageTextGroup {
  pageNumber: number;
  sentences: ReaderSentence[];
}

export interface DocumentSpeechData {
  pageCount: number;
  totalSentences: number;
  totalWords: number;
  pages: PageTextGroup[];
  allSentences: ReaderSentence[];
}

/**
 * Cleans up raw PDF extracted text, repairs broken hyphenations, and collapses extra whitespace
 */
export function cleanPdfText(rawText: string): string {
  if (!rawText) return '';

  return rawText
    // Remove hyphenation at line breaks: "docu-\nment" -> "document"
    .replace(/(\w+)-\s*\n\s*(\w+)/g, '$1$2')
    // Replace single line breaks with spaces
    .replace(/(?<!\n)\n(?!\n)/g, ' ')
    // Collapse multiple spaces into single space
    .replace(/[ \t]+/g, ' ')
    // Collapse excessive blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Segments cleaned page text into natural sentences for speech synthesis
 */
export function segmentIntoSentences(
  pageText: string,
  pageNumber: number,
  startingIndex = 0
): ReaderSentence[] {
  const cleaned = cleanPdfText(pageText);
  if (!cleaned) return [];

  // Protect common abbreviations and month names before splitting
  const protectedText = cleaned
    .replace(/\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|etc|e\.g|i\.e|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.\s/gi, '$1___DOT___ ')
    .replace(/\b(\d+)\.\s+(\d+)/g, '$1___DEC___$2');

  // Split on sentence terminals followed by whitespace or end of string
  const rawParts = protectedText.split(/(?<=[.!?])\s+|\n\n+/);

  const sentences: ReaderSentence[] = [];
  let currentIdx = startingIndex;

  for (const part of rawParts) {
    const restored = part
      .replace(/___DOT___/g, '.')
      .replace(/___DEC___/g, '.')
      .trim();

    if (restored.length > 1) {
      sentences.push({
        id: `s-${pageNumber}-${currentIdx}`,
        sentenceIndex: currentIdx++,
        pageNumber,
        text: restored,
      });
    }
  }

  return sentences;
}

/**
 * Assembles document-wide structured speech data from page text arrays
 */
export function buildDocumentSpeechData(
  pagesText: { pageNumber: number; text: string }[]
): DocumentSpeechData {
  const pages: PageTextGroup[] = [];
  const allSentences: ReaderSentence[] = [];
  let currentSentenceIndex = 0;
  let totalWords = 0;

  for (const p of pagesText) {
    const sentences = segmentIntoSentences(p.text, p.pageNumber, currentSentenceIndex);
    currentSentenceIndex += sentences.length;

    for (const s of sentences) {
      allSentences.push(s);
      totalWords += s.text.split(/\s+/).filter(Boolean).length;
    }

    pages.push({
      pageNumber: p.pageNumber,
      sentences,
    });
  }

  return {
    pageCount: pagesText.length,
    totalSentences: allSentences.length,
    totalWords,
    pages,
    allSentences,
  };
}
