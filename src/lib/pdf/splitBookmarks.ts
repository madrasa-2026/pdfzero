import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { extractBookmarks, type BookmarkItem } from './bookmarks';

export interface ChapterSplitItem {
  index: number;
  title: string;
  startPage: number; // 1-based inclusive
  endPage: number; // 1-based inclusive
  pageCount: number;
  filename: string;
}

export interface SplitByBookmarksOptions {
  includeFrontMatter?: boolean;
  selectedChapterIndices?: number[]; // If provided, only extract these chapter indices (1-based)
  level?: 'top-level' | 'all';
}

export interface ChapterFile {
  index: number;
  filename: string;
  title: string;
  startPage: number;
  endPage: number;
  pageCount: number;
  bytes: Uint8Array;
}

export interface SplitByBookmarksResult {
  hasBookmarks: boolean;
  totalChapters: number;
  extractedChapters: ChapterFile[];
  zipBytes: Uint8Array;
  originalPageCount: number;
}

/**
 * Sanitizes a title string into a safe, valid file system filename
 */
export function sanitizeFilename(title: string): string {
  const sanitized = title
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
  return sanitized || 'Chapter';
}

/**
 * Calculates continuous chapter ranges based on extracted bookmarks and total pages
 */
export function calculateChapterRanges(
  bookmarks: BookmarkItem[],
  totalPages: number,
  options: { includeFrontMatter?: boolean; level?: 'top-level' | 'all' } = {}
): ChapterSplitItem[] {
  const { includeFrontMatter = true, level = 'top-level' } = options;

  let flatList: BookmarkItem[] = [];
  if (level === 'top-level') {
    flatList = bookmarks;
  } else {
    function flatten(items: BookmarkItem[]) {
      for (const item of items) {
        flatList.push(item);
        if (item.children && item.children.length > 0) {
          flatten(item.children);
        }
      }
    }
    flatten(bookmarks);
  }

  // Filter valid page ranges and sort ascending
  const valid = flatList
    .filter((b) => b.pageNumber >= 1 && b.pageNumber <= totalPages)
    .sort((a, b) => a.pageNumber - b.pageNumber);

  if (valid.length === 0) return [];

  const chapters: ChapterSplitItem[] = [];
  let currentIndex = 1;

  // Check if first bookmark starts after page 1
  if (includeFrontMatter && valid[0].pageNumber > 1) {
    const end = valid[0].pageNumber - 1;
    chapters.push({
      index: currentIndex++,
      title: 'Front Matter',
      startPage: 1,
      endPage: end,
      pageCount: end,
      filename: `01_Front Matter.pdf`,
    });
  }

  for (let i = 0; i < valid.length; i++) {
    const current = valid[i];
    const next = valid[i + 1];

    const start = current.pageNumber;
    let end = next ? next.pageNumber - 1 : totalPages;
    if (end < start) end = start;

    const count = end - start + 1;
    const cleanTitle = sanitizeFilename(current.title);
    const prefix = currentIndex < 10 ? `0${currentIndex}` : `${currentIndex}`;

    chapters.push({
      index: currentIndex++,
      title: current.title,
      startPage: start,
      endPage: end,
      pageCount: count,
      filename: `${prefix}_${cleanTitle}.pdf`,
    });
  }

  return chapters;
}

/**
 * Splits a PDF document by its embedded bookmarks into individual chapter files and a bundled ZIP
 */
export async function splitPdfByBookmarks(
  inputBytes: Uint8Array,
  options: SplitByBookmarksOptions = {}
): Promise<SplitByBookmarksResult> {
  const extraction = await extractBookmarks(inputBytes);
  const srcDoc = await PDFDocument.load(inputBytes, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();

  if (!extraction.hasBookmarks || extraction.bookmarks.length === 0) {
    return {
      hasBookmarks: false,
      totalChapters: 0,
      extractedChapters: [],
      zipBytes: new Uint8Array(0),
      originalPageCount: totalPages,
    };
  }

  const allChapters = calculateChapterRanges(extraction.bookmarks, totalPages, {
    includeFrontMatter: options.includeFrontMatter ?? true,
    level: options.level ?? 'top-level',
  });

  const selectedIndices = options.selectedChapterIndices
    ? new Set(options.selectedChapterIndices)
    : null;

  const targetChapters = selectedIndices
    ? allChapters.filter((c) => selectedIndices.has(c.index))
    : allChapters;

  const zip = new JSZip();
  const extractedChapters: ChapterFile[] = [];

  for (const ch of targetChapters) {
    const destDoc = await PDFDocument.create();
    const pageIndices: number[] = [];
    for (let p = ch.startPage; p <= ch.endPage; p++) {
      pageIndices.push(p - 1);
    }

    const copiedPages = await destDoc.copyPages(srcDoc, pageIndices);
    copiedPages.forEach((page) => destDoc.addPage(page));

    const chapterBytes = await destDoc.save();

    extractedChapters.push({
      index: ch.index,
      filename: ch.filename,
      title: ch.title,
      startPage: ch.startPage,
      endPage: ch.endPage,
      pageCount: ch.pageCount,
      bytes: chapterBytes,
    });

    zip.file(ch.filename, chapterBytes);
  }

  const zipBytes = await zip.generateAsync({ type: 'uint8array' });

  return {
    hasBookmarks: true,
    totalChapters: targetChapters.length,
    extractedChapters,
    zipBytes,
    originalPageCount: totalPages,
  };
}
