import { describe, it, expect } from 'vitest';
import {
  cleanPdfText,
  segmentIntoSentences,
  buildDocumentSpeechData,
} from '../../src/lib/pdf/reader';

describe('PDF Audio Reader & TTS Engine', () => {
  it('repairs broken hyphenated words across line breaks', () => {
    const raw = 'This is an im-\nportant docu-\n  ment for review.';
    const cleaned = cleanPdfText(raw);
    expect(cleaned).toBe('This is an important document for review.');
  });

  it('segments text into natural sentences while respecting titles and abbreviations', () => {
    const text = 'Hello world! Dr. Smith visited on Jan. 15. Is this ready? Yes, it is.';
    const sentences = segmentIntoSentences(text, 1);

    expect(sentences.length).toBe(4);
    expect(sentences[0].text).toBe('Hello world!');
    expect(sentences[1].text).toBe('Dr. Smith visited on Jan. 15.');
    expect(sentences[2].text).toBe('Is this ready?');
    expect(sentences[3].text).toBe('Yes, it is.');
  });

  it('builds continuous document-wide sentence indexing across multi-page input', () => {
    const pages = [
      { pageNumber: 1, text: 'Page one first sentence. Page one second sentence.' },
      { pageNumber: 2, text: 'Page two first sentence.' },
    ];

    const data = buildDocumentSpeechData(pages);

    expect(data.pageCount).toBe(2);
    expect(data.totalSentences).toBe(3);
    expect(data.allSentences[0].sentenceIndex).toBe(0);
    expect(data.allSentences[1].sentenceIndex).toBe(1);
    expect(data.allSentences[2].sentenceIndex).toBe(2);
    expect(data.allSentences[2].pageNumber).toBe(2);
    expect(data.totalWords).toBeGreaterThan(10);
  });
});
