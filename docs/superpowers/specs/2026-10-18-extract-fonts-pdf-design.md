# Spec: PDF Embedded Font Extractor & TTF Ripper (/tools/extract-fonts-pdf)

## 1. Problem Statement & Value Proposition
PDFs often contain embedded proprietary, discontinued, or custom-designed typography embedded directly within the document stream. Designers, forensic document examiners, archivists, and developers frequently need to inspect or extract these font binaries, but Adobe Acrobat Pro doesn't provide a direct "Export Fonts" utility, and paid tools charge expensive licenses or require command-line FontForge/FontTools setups.

AirPDF's **PDF Font Extractor & TTF Ripper** solves this directly in the browser:
- Traverses PDF indirect objects for `/Font`, `/FontDescriptor`, `/FontFile`, `/FontFile2`, and `/FontFile3` streams.
- Decompresses raw TrueType (`.ttf`), OpenType (`.otf`), and PostScript CFF (`.cff`) binaries without server upload.
- Strips 6-character subset tags (`[A-Z]{6}\+`) to restore clean typographic family names.
- Dynamically injects an in-memory `@font-face` stylesheet allowing live interactive specimen rendering directly in the browser.
- Exports individual font files or a single bundled `.zip` archive complete with a manifest.

---

## 2. Technical Architecture & Stream Extraction

### 2.1 PDF-Lib Traversal Model
1. Load PDF with `PDFDocument.load(pdfBytes, { ignoreEncryption: true })`.
2. Access `doc.context.enumerateIndirectObjects()`.
3. Locate all `PDFDict` objects having `/Type /FontDescriptor` or `/Type /Font`.
4. Inspect stream keys:
   - `/FontFile2`: TrueType binary (`.ttf`).
   - `/FontFile3`: OpenType (`OTTO` magic) or CFF binary (`.otf` / `.cff`).
   - `/FontFile`: PostScript Type 1 program (`.pfb`).
5. Use `decodePDFRawStream(streamObj).getBytes()` to decompress Flate streams directly into raw byte buffers.
6. Verify magic header bytes:
   - `0x00, 0x01, 0x00, 0x00` or `0x74, 0x72, 0x75, 0x65` (`true`) -> `.ttf`
   - `0x4F, 0x54, 0x54, 0x4F` (`OTTO`) -> `.otf`
   - `0x77, 0x4F, 0x46, 0x46` (`wOFF`) -> `.woff`
   - Other -> `.cff` or fallback extension.

### 2.2 Data Contract
```typescript
export interface ExtractedFont {
  id: string;
  fontName: string;
  cleanFamilyName: string;
  subtype: string;
  format: 'ttf' | 'otf' | 'cff' | 'pfb';
  extension: string;
  data: Uint8Array;
  sizeBytes: number;
  isSubset: boolean;
}

export interface FontExtractionResult {
  fonts: ExtractedFont[];
  totalEmbeddedCount: number;
  totalSizeFormatted: string;
}
```

---

## 3. Dynamic Browser Preview Specimen Engine
In the client island:
1. For each valid TTF/OTF font, construct a blob URL: `URL.createObjectURL(new Blob([font.data], { type: 'font/ttf' }))`.
2. Register a temporary `@font-face` CSS rule:
   ```css
   @font-face {
     font-family: "ExtractedFont_123";
     src: url(blob:...);
   }
   ```
3. Apply `style="font-family: 'ExtractedFont_123', sans-serif"` to an interactive editable text box showing character glyphs `Aa Bb Cc 123...`.
4. Users can test typing their own text to see glyph coverage!

---

## 4. Quality & Audit Gates
- Unit test suite verifying extraction from synthetic PDFs with embedded streams and subset tag stripping.
- Vitest and Astro static build verification.
- SEO & Semantic Schemas: WebApplication and FAQPage.
- Dual audit verification on production deployments (`airpdf.pages.dev` and `pdfzero.pages.dev`).
