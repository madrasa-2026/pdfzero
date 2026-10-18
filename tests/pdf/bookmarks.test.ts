import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  applyBookmarks,
  extractBookmarks,
  type BookmarkItem,
} from '../../src/lib/pdf/bookmarks';

describe('PDF Bookmarks & Outlines Tree Engine', () => {
  it('applies flat bookmarks to PDF document and sets UseOutlines', async () => {
    const doc = await PDFDocument.create();
    for (let i = 0; i < 5; i++) {
      doc.addPage([400, 600]);
    }
    const inputBytes = await doc.save();

    const bookmarks: BookmarkItem[] = [
      { title: 'Introduction', pageNumber: 1 },
      { title: 'Methodology', pageNumber: 3 },
      { title: 'Conclusion', pageNumber: 5 },
    ];

    const outputBytes = await applyBookmarks(inputBytes, bookmarks);
    expect(outputBytes.length).toBeGreaterThan(0);

    const extraction = await extractBookmarks(outputBytes);
    expect(extraction.hasBookmarks).toBe(true);
    expect(extraction.bookmarks.length).toBe(3);
    expect(extraction.bookmarks[0].title).toBe('Introduction');
    expect(extraction.bookmarks[0].pageNumber).toBe(1);
    expect(extraction.bookmarks[1].title).toBe('Methodology');
    expect(extraction.bookmarks[1].pageNumber).toBe(3);
    expect(extraction.bookmarks[2].title).toBe('Conclusion');
    expect(extraction.bookmarks[2].pageNumber).toBe(5);
  });

  it('applies and reads nested bookmark hierarchy (Chapters and Sections)', async () => {
    const doc = await PDFDocument.create();
    for (let i = 0; i < 10; i++) {
      doc.addPage([400, 600]);
    }
    const inputBytes = await doc.save();

    const nestedBookmarks: BookmarkItem[] = [
      {
        title: 'Chapter 1: Foundations',
        pageNumber: 1,
        children: [
          { title: '1.1 Core Principles', pageNumber: 2 },
          { title: '1.2 Architecture Overview', pageNumber: 4 },
        ],
      },
      {
        title: 'Chapter 2: Implementation',
        pageNumber: 6,
        children: [
          { title: '2.1 Benchmarks', pageNumber: 8 },
        ],
      },
    ];

    const outputBytes = await applyBookmarks(inputBytes, nestedBookmarks);
    const extraction = await extractBookmarks(outputBytes);

    expect(extraction.hasBookmarks).toBe(true);
    expect(extraction.bookmarks.length).toBe(2);

    // Verify Chapter 1 children
    const ch1 = extraction.bookmarks[0];
    expect(ch1.title).toBe('Chapter 1: Foundations');
    expect(ch1.children?.length).toBe(2);
    expect(ch1.children?.[0].title).toBe('1.1 Core Principles');
    expect(ch1.children?.[0].pageNumber).toBe(2);
    expect(ch1.children?.[1].title).toBe('1.2 Architecture Overview');
    expect(ch1.children?.[1].pageNumber).toBe(4);

    // Verify Chapter 2 children
    const ch2 = extraction.bookmarks[1];
    expect(ch2.title).toBe('Chapter 2: Implementation');
    expect(ch2.children?.length).toBe(1);
    expect(ch2.children?.[0].title).toBe('2.1 Benchmarks');
    expect(ch2.children?.[0].pageNumber).toBe(8);
  });

  it('correctly handles Unicode titles (e.g. Bengali characters)', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([400, 600]);
    const inputBytes = await doc.save();

    const unicodeBookmarks: BookmarkItem[] = [
      { title: 'অধ্যায় ১: সূচনা', pageNumber: 1 },
    ];

    const outputBytes = await applyBookmarks(inputBytes, unicodeBookmarks);
    const extraction = await extractBookmarks(outputBytes);

    expect(extraction.hasBookmarks).toBe(true);
    expect(extraction.bookmarks[0].title).toBe('অধ্যায় ১: সূচনা');
  });
});
