import {
  PDFDocument,
  PDFName,
  PDFDict,
  PDFRef,
  PDFArray,
  PDFHexString,
  PDFString,
  PDFNumber,
} from 'pdf-lib';

export interface BookmarkItem {
  id?: string;
  title: string;
  pageNumber: number; // 1-based index
  children?: BookmarkItem[];
}

export interface BookmarkExtractionResult {
  hasBookmarks: boolean;
  bookmarks: BookmarkItem[];
  pageCount: number;
}

/**
 * Helper to decode PDFString or PDFHexString title
 */
function decodeTitle(titleObj: any): string {
  if (!titleObj) return '';
  if (titleObj instanceof PDFHexString) {
    return titleObj.decodeText();
  }
  if (titleObj instanceof PDFString) {
    return titleObj.decodeText();
  }
  return String(titleObj);
}

/**
 * Recursively reads outline nodes from an outline dictionary
 */
function readOutlineChildren(
  doc: PDFDocument,
  firstRefOrDict: any,
  pageRefToNumMap: Map<string, number>
): BookmarkItem[] {
  const items: BookmarkItem[] = [];
  let currentRefOrDict = firstRefOrDict;

  while (currentRefOrDict) {
    const node = currentRefOrDict instanceof PDFRef
      ? (doc.context.lookup(currentRefOrDict) as PDFDict)
      : (currentRefOrDict as PDFDict);

    if (!node || !(node instanceof PDFDict)) break;

    const titleObj = node.lookup(PDFName.of('Title'));
    const title = decodeTitle(titleObj);

    // Resolve page number from /Dest or /A << /D >>
    let pageNum = 1;
    let dest = node.lookup(PDFName.of('Dest'));
    if (!dest) {
      const action = node.lookup(PDFName.of('A'));
      if (action instanceof PDFDict) {
        dest = action.lookup(PDFName.of('D'));
      }
    }

    if (dest instanceof PDFArray && dest.size() > 0) {
      const pageRef = dest.get(0);
      if (pageRef instanceof PDFRef) {
        const mapped = pageRefToNumMap.get(pageRef.toString());
        if (mapped) pageNum = mapped;
      }
    }

    const item: BookmarkItem = {
      title: title || `Page ${pageNum}`,
      pageNumber: pageNum,
    };

    // Check for nested children
    const firstChild = node.lookup(PDFName.of('First'));
    if (firstChild) {
      const children = readOutlineChildren(doc, firstChild, pageRefToNumMap);
      if (children.length > 0) {
        item.children = children;
      }
    }

    items.push(item);

    // Advance to next sibling
    currentRefOrDict = node.lookup(PDFName.of('Next'));
  }

  return items;
}

/**
 * Extracts existing Table of Contents / Bookmarks from a PDF buffer
 */
export async function extractBookmarks(pdfBytes: Uint8Array): Promise<BookmarkExtractionResult> {
  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const pageCount = doc.getPageCount();

  const pageRefToNumMap = new Map<string, number>();
  doc.getPages().forEach((page, idx) => {
    pageRefToNumMap.set(page.ref.toString(), idx + 1);
  });

  const outlinesRefOrDict = doc.catalog.lookup(PDFName.of('Outlines'));
  if (!outlinesRefOrDict) {
    return { hasBookmarks: false, bookmarks: [], pageCount };
  }

  const outlinesDict = outlinesRefOrDict instanceof PDFRef
    ? (doc.context.lookup(outlinesRefOrDict) as PDFDict)
    : (outlinesRefOrDict as PDFDict);

  if (!(outlinesDict instanceof PDFDict)) {
    return { hasBookmarks: false, bookmarks: [], pageCount };
  }

  const first = outlinesDict.lookup(PDFName.of('First'));
  if (!first) {
    return { hasBookmarks: false, bookmarks: [], pageCount };
  }

  const bookmarks = readOutlineChildren(doc, first, pageRefToNumMap);

  return {
    hasBookmarks: bookmarks.length > 0,
    bookmarks,
    pageCount,
  };
}

/**
 * Recursively constructs and registers outline item dictionaries in PDF context
 */
function buildOutlineLevel(
  doc: PDFDocument,
  items: BookmarkItem[],
  parentRef: PDFRef
): { firstRef: PDFRef; lastRef: PDFRef; totalCount: number } | null {
  if (!items || items.length === 0) return null;

  const itemRefs: PDFRef[] = [];
  const itemDicts: PDFDict[] = [];
  let totalCount = items.length;

  // Pre-allocate refs so siblings can cross-link
  for (let i = 0; i < items.length; i++) {
    itemRefs.push(doc.context.nextRef());
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const dict = doc.context.obj({}) as PDFDict;

    // 1. Title with Unicode support
    dict.set(PDFName.of('Title'), PDFHexString.fromText(item.title || 'Untitled'));

    // 2. Parent link
    dict.set(PDFName.of('Parent'), parentRef);

    // 3. Sibling links
    if (i > 0) {
      dict.set(PDFName.of('Prev'), itemRefs[i - 1]);
    }
    if (i < items.length - 1) {
      dict.set(PDFName.of('Next'), itemRefs[i + 1]);
    }

    // 4. Destination page
    const pageIdx = Math.max(0, Math.min(doc.getPageCount() - 1, (item.pageNumber || 1) - 1));
    const targetPage = doc.getPage(pageIdx);
    const dest = doc.context.obj([targetPage.ref, 'Fit']);
    dict.set(PDFName.of('Dest'), dest);

    // 5. Nested children
    if (item.children && item.children.length > 0) {
      const childLevel = buildOutlineLevel(doc, item.children, itemRefs[i]);
      if (childLevel) {
        dict.set(PDFName.of('First'), childLevel.firstRef);
        dict.set(PDFName.of('Last'), childLevel.lastRef);
        dict.set(PDFName.of('Count'), PDFNumber.of(childLevel.totalCount));
        totalCount += childLevel.totalCount;
      }
    }

    itemDicts.push(dict);
  }

  // Register in context
  for (let i = 0; i < itemRefs.length; i++) {
    doc.context.assign(itemRefs[i], itemDicts[i]);
  }

  return {
    firstRef: itemRefs[0],
    lastRef: itemRefs[itemRefs.length - 1],
    totalCount,
  };
}

/**
 * Writes or replaces the Table of Contents / Outlines hierarchy in a PDF
 */
export async function applyBookmarks(
  pdfBytes: Uint8Array,
  bookmarks: BookmarkItem[]
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

  if (!bookmarks || bookmarks.length === 0) {
    // If empty list, remove outlines
    doc.catalog.delete(PDFName.of('Outlines'));
    return doc.save({ useObjectStreams: false });
  }

  const outlinesRef = doc.context.nextRef();
  const rootLevel = buildOutlineLevel(doc, bookmarks, outlinesRef);

  if (!rootLevel) {
    return doc.save({ useObjectStreams: false });
  }

  const outlinesDict = doc.context.obj({
    Type: 'Outlines',
    First: rootLevel.firstRef,
    Last: rootLevel.lastRef,
    Count: PDFNumber.of(rootLevel.totalCount),
  });

  doc.context.assign(outlinesRef, outlinesDict);

  doc.catalog.set(PDFName.of('Outlines'), outlinesRef);
  // Tell PDF viewers to automatically open the outlines/bookmarks sidebar
  doc.catalog.set(PDFName.of('PageMode'), PDFName.of('UseOutlines'));

  return doc.save({ useObjectStreams: false });
}
