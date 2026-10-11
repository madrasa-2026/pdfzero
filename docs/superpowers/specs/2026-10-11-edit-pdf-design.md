# Design Specification: AirPDF Client-Side Edit PDF Tool (`/tools/edit-pdf`) — Sejda-Parity Suite

**Document Date:** 2026-10-11  
**Status:** Validated Design Spec (Sejda-Parity Expansion)  
**Target Modules:** `src/lib/pdf/edit.ts`, `src/components/tools/EditPdfIsland.astro`, `src/content/tools/edit-pdf.md`

---

## 1. Executive Summary & Goals

The **Edit PDF** tool expands AirPDF with an in-browser PDF editing suite matching the usability and feature set of Sejda's editor, rebuilt on our **100% client-side WebAssembly & JavaScript architecture**.

### Core Constraints & Guarantees
* **100% Client-Side**: No uploads, zero network traffic, files never leave user device memory.
* **Vector-Only Stamping**: Native `pdf-lib` operators only (`drawText`, `drawRectangle`, `drawLine`, `drawImage` for user-uploaded image assets). Zero rasterization of the annotation layer.
* **Bengali Typography Support**: Embedded Unicode font (`Noto Sans Bengali` / `SolaimanLipi`) via `@pdf-lib/fontkit` for full Bengali (বাংলা) rendering without missing glyphs.
* **Honest Whiteout Disclosure**: Labeled strictly as *"Whiteout (visual cover only)"* with an omnipresent on-screen warning: *"Covered text remains extractable from the file — not true redaction."* No claims of permanent redaction.
* **Compatibility Test Matrix**: Verified against Google Chrome, Adobe Acrobat Reader, Microsoft Edge, Apple Preview, and Foxit PDF Reader.
* **Privacy Headline**: Prominent editor banner:
  > **🔒 100% private — your file never leaves this device. Nothing uploaded, nothing stored.**
  (Highlighting our decisive privacy advantage over Sejda, which processes files on remote cloud servers).
* **Explicitly v2 Out of Scope**: True in-place content-stream reflow text editing, and true content-stream cryptographic redaction.

---

## 2. Sejda-Parity Toolbar & Tool Specifications

The top toolbar matches Sejda's 11-tool layout:
`[Text] [Edit Text] [Images] [Annotate] [Shapes] [Whiteout] [Forms] [Links] [Sign] [Find] [Pages]`

### 2.1 Tool Specifications

1. **Text**:
   * Click anywhere on the active page $\rightarrow$ spawns an editable text frame.
   * Controls: Font size (`12pt`, `14pt`, `18pt`, `24pt`, `32pt`), Color (Obsidian Black `#000000`, Deep Blue `#2563EB`, Crimson Red `#DC2626`, Crisp White `#FFFFFF`).
   * Drag to move placed text box to desired coordinates.
   * Multilingual engine: seamlessly renders both Latin-1 and Bengali (বাংলা) characters via fontkit.

2. **Edit Existing Text (v1 Approach)**:
   * Hover/click detected text line (extracted via `pdfjs-dist` text layer).
   * Spawns an auto-sized whiteout box matching the exact line bounding box, overlaid with an editable text input pre-filled with the original text string at the same font size and position.
   * Stamped as vector whiteout rectangle + replacement vector `drawText`.
   * Visually seamless. Strictly documented in UI: *"Visual cover replacement — does not reflow underlying PDF font streams."*

3. **Images**:
   * File picker for PNG / JPG images.
   * Click page to place image.
   * Draggable position and corner-drag handles to resize while preserving aspect ratio.
   * Stamped via `pdfDoc.embedPng` / `pdfDoc.embedJpg` + `page.drawImage`.

4. **Annotate**:
   * **Highlight**: 35% opacity overlay (Yellow `#FEF08A`, Emerald `#A7F3D0`, Cyan `#A5F3FC`).
   * **Strikethrough**: Draw centered horizontal line segment across selected line.

5. **Shapes**:
   * **Rectangle**: Configurable border stroke (1–4px), stroke color, and optional fill color (or transparent fill).
   * **Ellipse / Circle**: Vector circle/ellipse stamped via curve segments or bounding rectangle geometry.

6. **Whiteout (Visual Cover Only)**:
   * Drag to draw white rectangular box over page elements.
   * On-screen persistent callout: *"Visual cover only — underlying text remains in the file."*
   * Stamped via `page.drawRectangle({ color: rgb(1, 1, 1), opacity: 1.0 })`.

7. **Forms**:
   * **Fill Existing AcroForms**: Inspects `pdfDoc.getForm()`; renders clickable text inputs, checkboxes, and radio buttons over detected form fields for direct browser entry.
   * **Add New Form Fields**: Allows placing new interactive Text Fields, Checkboxes, and Radio Buttons onto the document via `form.createTextField()`, `form.createCheckBox()`, `form.createRadioGroup()`.

8. **Links**:
   * Draw rectangular region $\rightarrow$ prompt for destination Web URL (`https://...`).
   * Stamped as native PDF Link Annotation (`PDFName.of('Link')` with URI Action dictionary) so viewers open the web page on click.

9. **Sign**:
   * Modal dialog offering 3 creation modes:
     1. **Type**: Type name $\rightarrow$ rendered in cursive handwriting script.
     2. **Draw**: Smooth freehand pen canvas $\rightarrow$ converted to chained vector line segments.
     3. **Upload**: Select image of signature (PNG/JPG).
   * Once created, signature can be clicked and placed onto any page; corner-drag handles to resize.
   * Persists in-session storage for instant re-use across multiple pages.

10. **Find & Replace**:
    * Document-wide search input searching text contents via `pdfjs-dist`.
    * Highlights matching occurrences across pages.
    * Replace feature: Automatically applies Whiteout + Replacement Text on selected match instances.

11. **Pages (Page Manager)**:
    * Left-hand thumbnail strip.
    * Drag-and-drop or `▲`/`▼` button reordering.
    * Individual page rotation buttons (`0°`, `90°`, `180°`, `270°`).
    * Per-page delete button (`🗑️`).

---

## 3. Workflow & UX Engine

1. **Upload**: Drag-and-drop zone with instant page count detection and 100MB safety ceiling.
2. **Editor Workspace**:
   * Top Sejda-style toolbar with tool mode switcher.
   * Prominent privacy callout: *"🔒 100% private — your file never leaves this device. Nothing uploaded, nothing stored."*
   * Center vector canvas viewport.
   * Left page thumbnail strip.
   * History manager: Undo (`Ctrl+Z`), Redo (`Ctrl+Y`), per-element delete (`Del`), clear page.
3. **Compilation & Export**:
   * Click **"Apply changes"** button.
   * Animated progress bar tracking vector compilation and page packaging.
   * Instant browser download blob.

---

## 4. Multilingual & Bengali Typography Architecture

1. **Fontkit Registration**:
   ```typescript
   import fontkit from '@pdf-lib/fontkit';
   pdfDoc.registerFontkit(fontkit);
   ```
2. **Font Asset Delivery**:
   * Store `NotoSansBengali-Regular.ttf` in `public/fonts/`.
   * Preload on editor boot so Bengali glyphs are immediately available.
3. **Dynamic Font Routing**:
   * Evaluates text string Unicode code points. If string contains Bengali range (`\u0980`–`\u09FF`), uses embedded `NotoSansBengaliFont`; otherwise falls back to `StandardFonts.Helvetica` or embedded font uniformly.

---

## 5. Verification & Viewer Compatibility Matrix

Pre-ship validation requires building a 3-page test PDF that demonstrates all 11 tools, and verifying in the target viewers:

| Target Viewer | Platform | Verification Criteria | Status |
| :--- | :--- | :--- | :---: |
| **Google Chrome** | Chromium / Desktop & Mobile | Vector annotations render cleanly; text is selectable; links open; Bengali script displays with correct conjuncts. | *Pending* |
| **Adobe Acrobat Reader** | Desktop / iOS / Android | Opens without errors; AcroForm fields filled and editable; signatures crisp; whiteout blocks visually opaque. | *Pending* |
| **Microsoft Edge** | PDFium / Edge PDF Reader | Proper layer rendering; transparent highlights allow underlying text reading; AcroForms functional. | *Pending* |
| **Apple Preview** | macOS CoreGraphics | Page rotations, page deletions, and text annotations render cleanly at 400% zoom. | *Pending* |
| **Foxit PDF Reader** | Foxit Core | Standard stream conformance; link annotations clickable. | *Pending* |

---

## 6. Self-Review & Integrity Checklist

- [x] **Placeholder Scan**: No TODOs or TBDs.
- [x] **Vector-Only Stamping**: Strictly native `pdf-lib` operators (`drawText`, `drawRectangle`, `drawLine`, `drawImage` for user images).
- [x] **No Redaction Claims**: Whiteout strictly labeled "Visual cover only".
- [x] **Bengali Support**: Fontkit TTF embedding pipeline specified.
- [x] **Privacy Advantage**: Clear callout emphasizing client-side superiority over Sejda.
