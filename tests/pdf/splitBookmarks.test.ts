import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { applyBookmarks } from '../../src/lib/pdf/bookmarks';
import {
  calculateChapterRanges,
  splitPdfByBookmarks,
  sanitizeFilename,
} from '../../src/lib/pdf/splitBookmarks';

describe('PDF Split by Bookmarks / Chapters Engine', () => {
  it('sanitizes titles into safe file system filenames', () => {
    expect(sanitizeFilename('Chapter 1: "Introduction" & Overview?')).toBe('Chapter 1- -Introduction- & Overview-');
    expect(sanitizeFilename('A/B Testing\\Methods*')).toBe('A-B Testing-Methods-');
  });

  it('calculates contiguous chapter ranges from bookmarks including front matter', () => {
    const bookmarks = [
      { title: 'Chapter 1', pageNumber: 5 },
      { title: 'Chapter 2', pageNumber: 15 },
      { title: 'Chapter 3', pageNumber: 30 },
    ];

    const ranges = calculateChapterRanges(bookmarks, 40, { includeFrontMatter: true });

    expect(ranges.length).toBe(4);
    // Front Matter: 1-4
    expect(ranges[0].title).toBe('Front Matter');
    expect(ranges[0].startPage).toBe(1);
    expect(ranges[0].endPage).toBe(4);
    expect(ranges[0].pageCount).toBe(4);

    // Chapter 1: 5-14
    expect(ranges[1].title).toBe('Chapter 1');
    expect(ranges[1].startPage).toBe(5);
    expect(ranges[1].endPage).toBe(14);
    expect(ranges[1].pageCount).toBe(10);

    // Chapter 2: 15-29
    expect(ranges[2].title).toBe('Chapter 2');
    expect(ranges[2].startPage).toBe(15);
    expect(ranges[2].endPage).toBe(29);
    expect(ranges[2].pageCount).toBe(15);

    // Chapter 3: 30-40
    expect(ranges[3].title).toBe('Chapter 3');
    expect(ranges[3].startPage).toBe(30);
    expect(ranges[3].endPage).toBe(40);
    expect(ranges[3].pageCount).toBe(11);
  });

  it('extracts chapter PDFs and bundles them into a valid ZIP archive', async () => {
    const doc = await PDFDocument.create();
    for (let i = 0; i < 10; i++) {
      const page = doc.addPage([500, 500]);
      page.drawText(`Page ${i + 1}`);
    }
    const rawBytes = await doc.save();

    // Apply bookmarks: Part I at page 1, Part II at page 6
    const bookmarkedBytes = await applyBookmarks(rawBytes, [
      { title: 'Part I - Foundations', pageNumber: 1 },
      { title: 'Part II - Advanced', pageNumber: 6 },
    ]);

    const result = await splitPdfByBookmarks(bookmarkedBytes);

    expect(result.hasBookmarks).toBe(true);
    expect(result.totalChapters).toBe(2);
    expect(result.extractedChapters.length).toBe(2);

    const ch1 = result.extractedChapters[0];
    expect(ch1.title).toBe('Part I - Foundations');
    expect(ch1.startPage).toBe(1);
    expect(ch1.endPage).toBe(5);
    expect(ch1.pageCount).toBe(5);

    const doc1 = await PDFDocument.load(ch1.bytes);
    expect(doc1.getPageCount()).toBe(5);

    const ch2 = result.extractedChapters[1];
    expect(ch2.title).toBe('Part II - Advanced');
    expect(ch2.startPage).toBe(6);
    expect(ch2.endPage).toBe(10);
    expect(ch2.pageCount).toBe(5);

    const doc2 = await PDFDocument.load(ch2.bytes);
    expect(doc2.getPageCount()).toBe(5);

    // Verify ZIP contains both files
    const zip = await JSZip.loadAsync(result.zipBytes);
    const filenames = Object.keys(zip.files);
    expect(filenames).toContain(ch1.filename);
    expect(filenames).toContain(ch2.filename);
  });
});
