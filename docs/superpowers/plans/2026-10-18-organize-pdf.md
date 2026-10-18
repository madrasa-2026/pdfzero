# Implementation Plan: PDF Visual Page Organizer & Sorter (`/tools/organize-pdf`)

## Phase 1: Pure Recompilation Engine (`src/lib/pdf/organizeEngine.ts`)
1. Define interfaces:
   - `PagePlan`: `{ sourcePageIndex: number; rotationDegrees: number }`
2. Implement `reorganizePdfDocument(pdfBytes: Uint8Array, plan: PagePlan[]): Promise<Uint8Array>`:
   - Handle empty plan validation (requires at least 1 page).
   - Normalize rotation to `[0, 90, 180, 270]`.
   - Support blank page insertion (`sourcePageIndex === -1`).
   - Copy selected pages using `destDoc.copyPages(srcDoc, [idx])`.
   - Apply updated rotation via `page.setRotation(degrees(newAngle))`.
   - Output valid PDF bytes with 100% vector retention.

## Phase 2: Unit Testing (`tests/pdf/organizeEngine.test.ts`)
1. Test reordering: changes `[0, 1, 2]` to `[2, 0, 1]`.
2. Test rotation: rotates specific page by 90° and 180°.
3. Test duplication: duplicates page 0 twice.
4. Test blank page insertion: inserts blank page at position 1.
5. Test reverse order: reverses an arbitrary multi-page document.

## Phase 3: Content Collection Entry (`src/content/tools/organize-pdf.md`)
- Title: "Organize PDF Pages — Visual Drag & Drop Page Sorter"
- Slug: `organize-pdf`
- Category: `organize`
- Icon: `layout`
- How-to steps and 6 detailed FAQs.

## Phase 4: UI Island (`src/components/tools/OrganizePdfIsland.astro`)
- Dropzone with drag/drop upload.
- Toolbar: "Reverse Order", "Rotate All", "Insert Blank Page", "Reset", and "Export".
- Interactive thumbnail grid:
  - Drag-and-drop reordering with ghost drag card.
  - Hover action icons: Rotate, Duplicate, Delete.
  - Page number badge showing updated sequential index.
- One-click "Download Organized PDF" button.

## Phase 5: Routing, Build, Deploy, and Dual Audit
- Add island to `src/pages/tools/[slug].astro`.
- Add link to `src/components/layout/Footer.astro` under Organize & Layout.
- Run tests (`npm run test`).
- Run build (`npm run build`).
- Git commit & push.
- Cloudflare Pages deploy (`airpdf` and `pdfzero`) on `main`.
- Dual Audit.
