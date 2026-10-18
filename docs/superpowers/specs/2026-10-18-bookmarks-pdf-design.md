# Specification: PDF Table of Contents (Bookmarks / Outlines) Editor (`/tools/bookmarks-pdf`)

## 1. Problem & Competitor Landscape
- **Competitor Lock-in:** Adobe Acrobat Pro, PDF Expert, and Nitro PDF charge $20–$30/month for adding or editing PDF Bookmarks (Table of Contents).
- **The Core Problem:** Long academic dissertations, eBooks, technical documentation, legal briefs, and scanned manuals are painful to navigate without a clickable Table of Contents sidebar. Most free web tools do not support modifying the PDF `/Outlines` hierarchy or corrupt existing outlines upon saving.
- **AirPDF Solution:** 100% in-browser Table of Contents & Outline Editor that parses, adds, edits, nests, and reorders PDF bookmarks in memory, linking each directly to target pages with Unicode support and zero server uploads.

## 2. Technical Architecture & Algorithm

### PDF Outline Hierarchy (`pdf-lib`)
ISO 32000-1 outlines structure:
- Root dictionary: `/Outlines` in Document Catalog (`doc.catalog.set(PDFName.of('Outlines'), outlinesDictRef)`).
- Outline Item Dictionary:
  - `/Title`: `PDFHexString.fromText(title)` (supports UTF-16BE / Unicode for all languages including Bengali, Arabic, Chinese).
  - `/Parent`: Pointer to parent outline item or root `/Outlines`.
  - `/Prev` & `/Next`: Double linked list between sibling items at the same level.
  - `/First` & `/Last`: Pointers to children outline items for nested chapters.
  - `/Dest`: `PDFArray` containing `[pageRef, PDFName.of('Fit')]` or `[pageRef, PDFName.of('XYZ'), null, null, null]`.

### Data Model
```ts
export interface BookmarkItem {
  id: string;
  title: string;
  pageNumber: number; // 1-based
  children?: BookmarkItem[];
}
```

### Outline Reader & Writer
1. **Reader:** Recursively walk `/Outlines -> /First -> /Next` to extract existing document outlines.
2. **Writer:** Construct fresh `PDFDict` nodes, link sibling pointers (`/Next`, `/Prev`), link parent and child pointers (`/First`, `/Last`), and update `/PageMode /UseOutlines` so PDF viewers immediately open with the bookmarks sidebar visible.

## 3. UI/UX Flow (`BookmarksPdfIsland.astro`)
1. **Dropzone:** File selection with detected page count and existing bookmarks count.
2. **Interactive Bookmark Tree Builder:**
   - Tree list view showing hierarchy (Chapter, Section, Page #).
   - "Add Bookmark" button with Title and Page Number inputs.
   - Indent / Outdent buttons for nesting sections under chapters.
   - Delete and Reorder controls.
   - Quick "Auto-Generate from Page Numbers" helper.
3. **Save Action:**
   - One-click build and download with `-bookmarked.pdf` suffix.

## 4. Verification & Testing Strategy
- Unit tests in `tests/pdf/bookmarks.test.ts`:
  - Verify outline tree builder and sibling/parent pointer linking.
  - Verify reading and writing Unicode bookmark titles.
  - Verify destination page resolution.
- Dual Audit:
  - Code/Security: Vitest, zero external requests.
  - Human UX: Dropzone, tree controls, download action, SEO/FAQ verification.
