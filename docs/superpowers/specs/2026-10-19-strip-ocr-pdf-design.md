# Spec: PDF Invisible OCR Text Layer Stripper & Decoupler (/tools/strip-ocr-pdf)

## 1. Problem Statement & Value Proposition
When documents are processed by automated scanner software or bad OCR tools (e.g. Acrobat OCR, Abbyy, mobile scanner apps), an **invisible text layer** is injected using PDF PostScript operator `3 Tr` (render mode 3: neither fill nor stroke).
Frequently, this OCR layer:
1. Has misaligned character positions that produce garbled text selections when copying.
2. Contains spelling errors or OCR hallucinations.
3. Leaks confidential or sensitive keyword metadata.
4. Prevents high-accuracy modern AI OCR models (Tesseract 5, Claude, Gemini Vision) from re-indexing the document because readers assume the document is already text-searchable.

Traditional desktop PDF editors force users to rasterize the entire PDF into JPEG images at 150 DPI to strip the text layer, destroying sharp vector linework and bloating file sizes by 10x!

AirPDF's **PDF Invisible OCR Text Layer Stripper** removes the invisible OCR text layer at the raw PostScript content stream level with:
- Zero rasterization / 100% preservation of underlying scans and vector artwork.
- Targeted removal of `3 Tr` (invisible render mode) blocks and text blocks (`BT ... ET`) while keeping image XObjects and vector paths pristine.
- Optional removal of all text objects (`BT ... ET`) to convert vector/text pages into clean visual-only artwork.
- 100% client-side execution in browser memory with zero server uploads.

---

## 2. Technical Architecture & Stream Parsing

### 2.1 PostScript Text Operators
- `BT`: Begin Text object.
- `ET`: End Text object.
- `3 Tr`: Set text rendering mode to 3 (Neither fill nor stroke text = Invisible text layer).
- `0 Tr`: Set text rendering mode to 0 (Fill text = Normal visible text).
- `Tj`, `TJ`, `'`, `"`: Text display operators.

### 2.2 Stripping Engine Modes
```typescript
export interface StripOcrOptions {
  mode: 'invisible-only' | 'all-text'; // default: 'invisible-only'
  cleanMetadata?: boolean;            // default: true
}

export interface StripOcrResult {
  pdfBytes: Uint8Array;
  pagesProcessed: number;
  invisibleBlocksRemoved: number;
  originalSizeBytes: number;
  cleanedSizeBytes: number;
}
```

### 2.3 Algorithm
1. Enumerate all pages in the PDF document using `pdf-lib`.
2. Retrieve each page's `/Contents` stream (can be single `PDFRawStream` or `PDFArray` of streams).
3. Decompress Flate streams using `decodePDFRawStream` to ASCII/Latin-1 strings.
4. Parse text blocks bounded by `BT` and `ET`:
   - If `mode === 'invisible-only'`: Check if the block contains `3 Tr` (or matches invisible text positioning matrices without fill color). Replace that block with empty whitespace or remove it.
   - If `mode === 'all-text'`: Remove all `BT ... ET` blocks completely, leaving only image XObject invocations (`/Im... Do`) and vector drawing paths (`m`, `l`, `c`, `re`, `f`, `S`).
5. Recompress sanitized streams back into the PDF page's `/Contents`.
6. Save and output sanitized PDF.

---

## 3. Interactive Island UI
- Dropzone for any PDF document.
- Mode Selector:
  - **Option 1 (Recommended): Remove Invisible OCR Layer Only**: Preserves visible text, deletes only `3 Tr` invisible scan text.
  - **Option 2: Strip ALL Text Layers**: Completely eliminates all selectable text, leaving only visual artwork/scans (ideal for preventing copy/paste or preparing a clean slate for fresh OCR).
- Real-time stream stats: number of invisible blocks detected, pages cleaned.
- Download Cleaned PDF button with zero quality loss.

---

## 4. Quality & Audit Gates
- Unit test suite verifying targeted `3 Tr` stripping, text stream re-encoding, and preservation of image XObjects.
- Vitest and Astro static build verification.
- SEO & Semantic Schemas: WebApplication, FAQPage, and HowTo.
- Dual audit verification on production deployments (`airpdf.pages.dev` and `pdfzero.pages.dev`).
