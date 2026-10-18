# Specification: PDF Visual Page Organizer & Sorter (`/tools/organize-pdf`)

## 1. Executive Summary & Market Context
Users frequently scan contracts, receipts, chapters, or homework upside down, out of sequence, or with accidental blank sheets. Arranging, deleting, rotating, and duplicating pages is the single most common daily PDF task.

Adobe Acrobat Pro charges **$239/year** for "Organize Pages". Smallpdf charges **$108/year**, and iLovePDF restricts page sorting behind cloud queues that upload confidential documents to external servers.

**AirPDF Visual Page Organizer** brings a fluid, desktop-class visual grid workbench running 100% in-browser. Users can drag-and-drop reorder, rotate individual or bulk pages, delete unwanted pages, duplicate slides, insert blank divider pages, or reverse the entire document with 1-click. Output files preserve 100% vector typography with zero server uploads.

## 2. Core Functional Requirements

### 2.1 Visual Grid Workbench (`OrganizePdfIsland.astro`)
- **Drag-and-Drop Reorder**: HTML5 Drag and Drop with visual drop indicators between tiles.
- **Page Thumbnail Card**:
  - Rendered at ~150px width using `pdfjs-dist`.
  - Badges: Original page number vs New sequence position (e.g., `Page 1 -> Page 4`).
  - Action buttons:
    - Rotate clockwise (`+90°`)
    - Duplicate page
    - Delete page (removes card with smooth animation)
- **Batch Action Toolbar**:
  - "Reverse Order": Inverts page sequence (essential for reverse-fed document scanner trays).
  - "Rotate All": Rotates all pages clockwise 90°.
  - "Insert Blank Page": Inserts a blank standard A4/Letter page at the end or selected slot.
  - "Reset Layout": Restores original sequence and orientations.
- **Quick Keyboard Shortcuts**:
  - `Delete`/`Backspace`: remove selected card.
  - `R`: rotate selected card 90°.

### 2.2 Recompilation Engine (`src/lib/pdf/organizeEngine.ts`)
- Interface:
  ```ts
  export interface PagePlan {
    sourcePageIndex: number; // -1 for blank page
    rotationDegrees: number; // 0, 90, 180, 270 (additional rotation)
  }
  ```
- `reorganizePdfDocument(pdfBytes: Uint8Array, plan: PagePlan[]): Promise<Uint8Array>`
  - Loads source `PDFDocument`.
  - Creates destination `PDFDocument`.
  - For each `plan`:
    - If `sourcePageIndex === -1`: adds a blank page with matching dimensions.
    - Else: copies page via `destDoc.copyPages(srcDoc, [plan.sourcePageIndex])`, sets `page.setRotation(degrees(currentRotation + plan.rotationDegrees))`, and adds to `destDoc`.
  - Copies metadata and bookmarks where applicable.
  - Saves with zero rasterization.

## 3. Performance & Memory Safety
- Lazy thumbnail generation: handles 50+ page PDFs smoothly without browser freezing.
- Retains original page objects without re-encoding text streams or compressing images twice.
