# Sejda-Style Client-Side PDF Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-featured, 100% client-side PDF editor (`/tools/edit-pdf`) matching Sejda's 11-tool toolbar and UX flow with native vector-only stamping, Bengali font support, honest whiteout disclosures, and zero server uploads.

**Architecture:** Pure client-side Astro Island (`EditPdfIsland.astro`) combining a `pdfjs-dist` viewport with an interactive vector annotation surface. Edits are compiled directly in-browser using `pdf-lib` native vector operators (`drawText`, `drawRectangle`, `drawLine`, `drawImage`) and `@pdf-lib/fontkit` for Bengali Unicode TTF embedding. No rasterization at any stage.

**Tech Stack:** Astro, TypeScript, Tailwind CSS, `pdf-lib`, `@pdf-lib/fontkit`, `pdfjs-dist`, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-11-edit-pdf-design.md`

## Global Constraints

- **Execution Model:** 100% client-side WebAssembly / JS execution in-browser. Zero server uploads or remote API endpoints.
- **Vector-Only Stamping:** Annotations must compile strictly via native `pdf-lib` operators (`drawText`, `drawRectangle`, `drawLine`, `drawImage`). Zero annotation canvas rasterization to PNG/JPEG.
- **Multilingual / Bengali Typography:** Text tool must embed a TrueType Bengali font (`NotoSansBengali-Regular.ttf`) via `@pdf-lib/fontkit` to render native Bengali (বাংলা) characters without missing glyphs or encoding errors.
- **Honest Whiteout Disclosure:** Whiteout tool must be labeled *"Whiteout (visual cover only)"* and display on-screen notice: *"Covered text remains extractable from the file — not true redaction."* No claims of permanent redaction permitted.
- **Viewer Compatibility:** Output must open cleanly in Google Chrome, Adobe Acrobat Reader, Microsoft Edge, Apple Preview, and Foxit PDF Reader.
- **Client Safety Ceiling:** 100MB maximum file size limit enforced before loading into memory.
- **Privacy Headline:** Editor banner: *"🔒 100% private — your file never leaves this device. Nothing uploaded, nothing stored."*

## Review Focus

1. **Bengali Unicode Complex Glyphs / Conjuncts:** Input strings containing Bengali characters (`\u0980`–`\u09FF`) must not throw `WinAnsi cannot encode` and must render correct glyphs via fontkit.
2. **Coordinate & Scale Desync on High-DPI:** Placing text or whiteout over existing text must map from screen pixels to 72 pt/inch PDF space without drift across zoom levels.
3. **Whiteout Extracted Text Integrity:** Underlying PDF text stream remains intact beneath whiteout boxes, confirming visual-only masking without corrupted content streams.
4. **Vector Signature Path Stability:** Drawing freehand signatures generates chained line segments without exceeding PDF operator limits or crashing `pdf-lib`.
5. **Memory Management on Multi-Page Documents:** Reordering, rotating, and stamping edits across multi-page PDFs must release canvas memory buffers and respect the 100MB safety ceiling.

---

### Task 1: Bengali Font Assets & `@pdf-lib/fontkit` Vector Foundation

**Files:**
- Create: `public/fonts/NotoSansBengali-Regular.ttf`
- Create: `src/lib/pdf/fontkit.ts`
- Test: `tests/pdf/fontkit.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `loadBengaliFont(pdfDoc: PDFDocument): Promise<PDFFont>`
- Produces: `isBengaliText(text: string): boolean`

- [ ] **Step 1: Install `@pdf-lib/fontkit` and download `NotoSansBengali-Regular.ttf`**

Install dependency:
```bash
npm install @pdf-lib/fontkit
```
Download Google Noto Sans Bengali Regular TTF into `public/fonts/NotoSansBengali-Regular.ttf`.

- [ ] **Step 2: Write failing unit test for Bengali font embedding**

Create `tests/pdf/fontkit.test.ts`:
```typescript
import { test, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { loadBengaliFont, isBengaliText } from '../../src/lib/pdf/fontkit';

test('isBengaliText identifies Bengali characters', () => {
  expect(isBengaliText('Hello World')).toBe(false);
  expect(isBengaliText('বাংলা পরীক্ষা')).toBe(true);
});

test('embeds Bengali font and draws Bengali text without encoding errors', async () => {
  const doc = await PDFDocument.create();
  const page = doc.addPage([600, 400]);
  const font = await loadBengaliFont(doc);
  expect(() => {
    page.drawText('বাংলা নথি সম্পাদনা', { x: 50, y: 300, size: 20, font });
  }).not.toThrow();
  const bytes = await doc.save();
  expect(bytes.length).toBeGreaterThan(1000);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/pdf/fontkit.test.ts`
Expected: FAIL with module not found or functions not defined.

- [ ] **Step 4: Implement `src/lib/pdf/fontkit.ts`**

Register `@pdf-lib/fontkit`, fetch font array buffer (from `public/fonts/NotoSansBengali-Regular.ttf` or read local file in Node test environment), and embed via `pdfDoc.embedFont(bytes, { subset: true })`.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/pdf/fontkit.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json public/fonts/ src/lib/pdf/fontkit.ts tests/pdf/fontkit.test.ts
git commit -m "feat(pdf): add fontkit integration and Bengali Unicode font embedding"
```

---

### Task 2: Core Vector Stamping & Page Recombination Engine

**Files:**
- Create: `src/lib/pdf/edit.ts`
- Test: `tests/pdf/edit.test.ts`

**Interfaces:**
- Consumes: `loadBengaliFont` from `src/lib/pdf/fontkit.ts`
- Produces: `applyPdfEdits(fileBytes: Uint8Array, state: DocumentEditState, onProgress?: ProgressCallback): Promise<Uint8Array>`
- Defines data types:
  ```typescript
  export interface TextAnnotation { id: string; pageIndex: number; x: number; y: number; text: string; fontSize: number; color: string; }
  export interface WhiteoutAnnotation { id: string; pageIndex: number; x: number; y: number; width: number; height: number; color?: string; }
  export interface ShapeAnnotation { id: string; pageIndex: number; type: 'rect' | 'circle'; x: number; y: number; width: number; height: number; strokeColor: string; strokeWidth: number; fillColor?: string; }
  export interface SignatureAnnotation { id: string; pageIndex: number; points: { x: number; y: number }[][]; strokeColor: string; strokeWidth: number; }
  export interface ImageAnnotation { id: string; pageIndex: number; x: number; y: number; width: number; height: number; imageBytes: Uint8Array; format: 'png' | 'jpeg'; }
  export interface HighlightAnnotation { id: string; pageIndex: number; x: number; y: number; width: number; height: number; color: string; }
  export interface LinkAnnotation { id: string; pageIndex: number; x: number; y: number; width: number; height: number; url: string; }
  export interface PageConfig { originalIndex: number; rotation: number; isDeleted: boolean; }
  export interface DocumentEditState { pages: PageConfig[]; annotations: Annotation[]; formValues?: Record<string, string | boolean>; }
  ```

- [ ] **Step 1: Write failing unit test covering all 11 annotation primitives**

Create `tests/pdf/edit.test.ts`:
Tests vector-only stamping of text, Bengali text, visual whiteout, shapes, chained line signatures, image embedding, highlights, link annotations, and page rotation/deletion. Asserts no rasterization and valid PDF header/footer.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/pdf/edit.test.ts`
Expected: FAIL with "applyPdfEdits is not defined"

- [ ] **Step 3: Implement `applyPdfEdits` in `src/lib/pdf/edit.ts`**

Implement sequential page recombination via `copyPages`, apply rotations, map screen coordinates to 72 pt PDF points, and execute native vector operators:
- `page.drawText` with font routing (Bengali vs Helvetica).
- `page.drawRectangle` for whiteout (opaque) and highlights (opacity 0.35).
- `page.drawLine` chaining stroke point sequences for signatures and pen drawings.
- `page.drawImage` for user images.
- Native Link annotations via PDF dictionaries.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/pdf/edit.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/pdf/edit.ts tests/pdf/edit.test.ts
git commit -m "feat(pdf): implement native vector stamping and page recombination engine"
```

---

### Task 3: Text Layer Extraction & Find/Replace Engine

**Files:**
- Create: `src/lib/pdf/textExtraction.ts`
- Test: `tests/pdf/textExtraction.test.ts`

**Interfaces:**
- Produces: `extractPageTextItems(pdfDoc: PDFDocumentProxy, pageNumber: number): Promise<ExtractedTextItem[]>`
- Produces: `findTextMatches(items: ExtractedTextItem[], query: string): TextMatch[]`

- [ ] **Step 1: Write failing test for text item extraction and search matching**

Create `tests/pdf/textExtraction.test.ts`:
Tests parsing page text spans, computing bounding boxes, and finding search query occurrences.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/pdf/textExtraction.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `src/lib/pdf/textExtraction.ts`**

Use `pdfjs-dist` `getTextContent()` to extract text items and calculate viewport bounding boxes (`x, y, width, height, fontHeight`). Implement search matcher with case-insensitive token search.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/pdf/textExtraction.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/pdf/textExtraction.ts tests/pdf/textExtraction.test.ts
git commit -m "feat(pdf): add text layer extraction and find/replace coordinate engine"
```

---

### Task 4: Interactive Sejda-Style Editor Workbench UI

**Files:**
- Create: `src/components/tools/EditPdfIsland.astro`
- Test: `tests/components/EditPdfIsland.spec.ts` (Playwright component test)

**Interfaces:**
- Consumes: `applyPdfEdits` from `src/lib/pdf/edit.ts`
- Consumes: `extractPageTextItems` from `src/lib/pdf/textExtraction.ts`

- [ ] **Step 1: Build the Sejda-Style UI component shell**

Implement `src/components/tools/EditPdfIsland.astro`:
1. **Privacy Headline Banner**:
   `🔒 100% private — your file never leaves this device. Nothing uploaded, nothing stored.`
2. **Top Toolbar (11 Sejda tools)**:
   `[Text] [Edit Text] [Images] [Annotate] [Shapes] [Whiteout] [Forms] [Links] [Sign] [Find] [Pages]`
3. **Whiteout Warning Banner**:
   `Visual cover only — underlying text remains in the file.`
4. **Left Page Thumbnail Strip**:
   Reorder (`▲`/`▼`), Rotate (`↻`), Delete (`🗑️`).
5. **Interactive Viewport Surface**:
   PDF.js base canvas + SVG/Canvas overlay with mouse drag, click, and resize handles.
6. **Signature Modal**:
   3 modes: Type (script font), Draw (vector canvas), Upload (image). Session persistence.
7. **Find & Replace Drawer**:
   Search bar, occurrence counter, match navigator, and "Replace with text" trigger.
8. **Action Bar**:
   Undo (`Ctrl+Z`), Redo (`Ctrl+Y`), Delete (`Del`), Clear Page, and **"Apply changes"** button with compilation progress bar.

- [ ] **Step 2: Verify component compiles clean in Astro**

Run: `npm run build`
Expected: Completed with 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/tools/EditPdfIsland.astro
git commit -m "feat(ui): create Sejda-style interactive Edit PDF Island workbench"
```

---

### Task 5: SEO Editorial Page, Route Mounting & Navigation Integration

**Files:**
- Create: `src/content/tools/edit-pdf.md`
- Modify: `src/pages/tools/[slug].astro`
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Create `src/content/tools/edit-pdf.md`**

Write 250+ words of authoritative editorial copy:
- Client-side vector architecture, zero-upload privacy.
- Bengali typography support.
- Honest Whiteout disclosure ("Visual cover only — not cryptographic redaction").
- 5 search-intent FAQs (`FAQPage` schema).
- 4-step How-To guide.

- [ ] **Step 2: Mount `EditPdfIsland` in `src/pages/tools/[slug].astro`**

Conditionally mount `<EditPdfIsland />` when `tool.slug === 'edit-pdf'`.

- [ ] **Step 3: Add tool to Homepage Tools Directory in `src/pages/index.astro`**

Ensure `edit-pdf` appears in `sortedTools` under the `organize` category.

- [ ] **Step 4: Run build to verify 16 static routes generated**

Run: `npm run build`
Expected: 16 routes built cleanly (including `/tools/edit-pdf`).

- [ ] **Step 5: Commit**

```bash
git add src/content/tools/edit-pdf.md src/pages/tools/[slug].astro src/pages/index.astro
git commit -m "feat(content): add Edit PDF editorial content, SEO schema, and route mounting"
```

---

### Task 6: Multi-Viewer End-to-End Verification (3-Page Validation Suite)

**Files:**
- Create: `tests/e2e/edit-pdf.spec.ts`

- [ ] **Step 1: Write Playwright end-to-end test generating a 3-page edited PDF**

Tests the full Sejda workflow:
1. Uploads 3-page test document.
2. Demonstrates all 11 tools: Text (Bengali + English), Edit Text (whiteout + replacement), Images, Annotations (highlight + strikethrough), Shapes, Whiteout, Forms, Links, Sign, Find/Replace, Pages reordering & rotation.
3. Clicks "Apply changes" and downloads the edited document.
4. Asserts download triggers and file size is valid.

- [ ] **Step 2: Run Playwright test in headless Chrome & Edge**

Run: `npx playwright test tests/e2e/edit-pdf.spec.ts`
Expected: PASS with 0 errors.

- [ ] **Step 3: Inspect generated PDF in Adobe Acrobat & verify 5-viewer compatibility**

Verify output PDF structure, check Bengali text glyphs, vector lines, and link annotations. Record results in compatibility matrix.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/edit-pdf.spec.ts
git commit -m "test(e2e): add end-to-end 3-page validation suite for Sejda-style PDF editor"
```
