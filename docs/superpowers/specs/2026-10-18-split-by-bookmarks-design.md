# Design Spec: PDF Split by Bookmarks / Chapters (`/tools/split-by-bookmarks`)

## 1. Problem Statement & Motivation
Long documents such as textbooks, academic dissertations, legal deposition binders, annual financial reports, and technical manuals frequently contain an embedded Table of Contents (PDF Outline/Bookmarks). Users frequently need to break these massive documents into standalone chapter files (e.g., emailing Chapter 3 to a colleague, filing Exhibit B as a distinct legal motion, or organizing an ebook into separate modules).

Doing this manually requires calculating page ranges for each chapter, opening a generic split tool dozens of times, and manually renaming every file. Commercial tools (Adobe Acrobat Pro, PDFsam Enhanced, Sejda Pro) charge \$15–\$30/mo or restrict bookmark-based splitting to desktop licenses.

AirPDF provides a **100% Free, Client-Side PDF Split by Bookmarks / Chapters Tool** that automatically parses embedded outlines, maps chapter boundaries, generates clean vector PDFs named after each chapter, and bundles them into an instant ZIP archive.

## 2. Core Technical Engine (`src/lib/pdf/splitBookmarks.ts`)

### Bookmark Parsing & Range Calculation
1. **Extraction**:
   - Leverages `extractPdfBookmarks` to read document outline trees and resolve target page destinations.
2. **Chapter Range Determination**:
   - Sorts chapters by their 1-based start page number.
   - For chapter $i$ starting at page $P_i$, its end page is $P_{i+1} - 1$ (or total page count $N$ for the final chapter).
   - If multiple bookmarks target the same starting page, deduplicates or assigns minimum length of 1 page.
   - Handles documents where page 1 has no bookmark by automatically creating a "Front Matter / Preface" section (pages 1 to $P_1 - 1$).
3. **Splitting & Extraction**:
   - Uses `destDoc.copyPages(srcDoc, pageIndices)` to extract each chapter losslessly.
   - Preserves all vector fonts, images, text layers, and embedded annotations without rasterization.
4. **ZIP Packaging & Sanitized Naming**:
   - Sanitizes filenames removing illegal characters (`/ \ : * ? " < > |`).
   - Prefixes filenames with sequential numbers: e.g. `01_Introduction.pdf`, `02_Methods.pdf`.
   - Uses `JSZip` to generate a bundled `.zip` archive.

## 3. UI/UX Interface (`src/components/tools/SplitByBookmarksIsland.astro`)
1. **Dropzone**: Drag & drop PDF file.
2. **Chapter Inspector & Selection**:
   - Displays detected chapters in a timeline list:
     - Chapter Title
     - Page range (e.g. `Pages 15–42 (28 pages)`)
     - Checkbox to include/exclude specific chapters from the split.
   - Fallback mode: If no bookmarks exist, displays an alert allowing the user to either generate chapters by page interval or jump to the Bookmark Editor (`/tools/bookmarks-pdf`).
3. **Execution & Results**:
   - One-click "Download All Chapters (ZIP)".
   - List of individual download buttons for each chapter file.
