# Spec: PDF Interactive Form Field Creator & AcroForm Injector (/tools/form-creator-pdf)

## 1. Problem Statement & Value Proposition
Hundreds of millions of PDFs distributed by governments, employers, landlords, schools, and medical facilities are "flat" static files. Users are expected to print them out, handwrite in the blanks, and scan them back in, or pay $239/yr for Adobe Acrobat Pro or $144/yr for Smallpdf just to place interactive fillable form boxes.

AirPDF Form Field Creator turns any flat, non-fillable PDF into a fully compliant, interactive ISO 32000-1 AcroForm document directly in the browser with:
- Zero uploads / 100% client-side privacy.
- Visual drag-and-drop or point-and-click field placement onto high-res canvas pages.
- Smart auto-detection of blanks (`_____`, `Name:`, `Signature:`, `[ ]`) with 1-click conversion to AcroForm fields.
- Full support for Text Fields (single-line or multiline), Checkboxes, and Dropdowns.
- Real-time preview mode allowing users to test filling in the form right in the browser before export.
- Standard-compliant AcroForm dictionary output that opens natively in Chrome, Apple Preview, Adobe Acrobat Reader, Foxit, and mobile PDF readers.

---

## 2. Technical Architecture & Coordinate Mapping

### 2.1 PDF Coordinate Space vs Screen Canvas Space
- Screen Canvas Space: `(0, 0)` is at Top-Left. `y` increases downward.
- PDF Page Space: `(0, 0)` is at Bottom-Left. `y` increases upward.
- Coordinate transformation:
  $$\text{pdfX} = \frac{\text{canvasX}}{\text{scale}}$$
  $$\text{pdfY} = \text{pageHeight} - \frac{\text{canvasY} + \text{boxHeight}}{\text{scale}}$$
  $$\text{pdfWidth} = \frac{\text{canvasWidth}}{\text{scale}}$$
  $$\text{pdfHeight} = \frac{\text{canvasHeight}}{\text{scale}}$$

### 2.2 Field Model
```typescript
export type FieldType = 'text' | 'checkbox' | 'dropdown';

export interface FormFieldDefinition {
  id: string;
  name: string;
  type: FieldType;
  pageIndex: number;
  x: number;      // PDF pt coordinates (from bottom-left)
  y: number;
  width: number;
  height: number;
  defaultValue?: string;
  isMultiline?: boolean;
  options?: string[]; // For dropdowns
  required?: boolean;
}
```

### 2.3 AcroForm Injection Engine (`src/lib/pdf/formCreatorEngine.ts`)
1. Loads original PDF via `PDFDocument.load(pdfBytes)`.
2. Accesses or initializes the AcroForm catalog via `doc.getForm()`.
3. Iterates over field definitions:
   - For `text`: `form.createTextField(field.name)`. Sets default text if provided, sets multiline if requested, adds to target page with border and subtle background fill for visual clarity.
   - For `checkbox`: `form.createCheckBox(field.name)`. Configures checked/unchecked state, adds to target page.
   - For `dropdown`: `form.createDropdown(field.name)`. Adds options and sets default selection, adds to target page.
4. Preserves all existing vector art, text streams, bookmarks, and metadata.
5. Saves PDF and returns `Uint8Array`.

---

## 3. Smart Auto-Detection Heuristic
Scans extracted page text items (from `pdfjsLib.getTextContent()`):
1. **Underscore lines**: Sequences of 3 or more underscores (`___+`) or dot leaders (`\.\.\.+`) are detected as blank text fields. Field is placed directly over or spanning the underline.
2. **Label prompts**: Prompts ending with `:` (e.g. `Full Name:`, `Date of Birth:`, `Email Address:`) without text immediately following them within 200pt are detected as fillable slots.
3. **Checkboxes**: Literal bracket pairs `[ ]`, `( )`, or square box glyphs `\u25A1`, `\u25A2` are detected as checkbox fields.

---

## 4. Quality & Audit Gates
- Engine unit tests verifying field creation, multiline text fields, checkboxes, dropdowns, and multi-page placement.
- SEO & Semantic Schema: WebApplication and FAQPage schemas.
- Clean responsive layout for both desktop and mobile viewports.
- Dual audit verification on production deployments (`airpdf.pages.dev` and `pdfzero.pages.dev`).
