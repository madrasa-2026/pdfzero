# Specification: PDF Redaction Leak Verifier & Purger (`/tools/verify-redaction-pdf`)

## 1. Executive Summary & Forensic Background
In landmark court cases (e.g. Paul Manafort court filings, Apple vs. Samsung patent disclosures, and government FOIA leaks), lawyers and public agencies repeatedly leaked sensitive secrets because they applied "black redaction boxes" using Microsoft Word, macOS Preview, or basic PDF viewers. These applications simply draw a black rectangle on top of the text without removing the underlying text stream. Anyone can highlight the black box, press `Ctrl+C`, and copy the "redacted" secret text!

Enterprise legal discovery tools like Relativity or Nuance Power PDF charge **$1,200 to $5,000+ per seat** for redaction verification and sanitization.

**AirPDF Redaction Leak Verifier & Purger** provides a free, 100% client-side forensic scanner that:
1. Audits PDF content streams and annotation layers to detect dark/black fill rectangles.
2. Intersects bounding boxes of black rectangles with underlying text spans extracted via `pdfjs-dist` text stream parsing.
3. Flags any text that is visually covered by a black box but still exists in the selectable text layer ("Leaky Redaction Detected").
4. "X-Ray Mode": Visually renders the document with black boxes turned semi-transparent red, highlighting the leaked text trapped beneath.
5. "Hard Redaction Purge": Permanently strips underlying text characters from the PDF using true content stream removal, producing an un-crackable, court-ready PDF.

## 2. Technical Architecture

### 2.1 Detection Engine (`src/lib/pdf/redactionVerifierEngine.ts`)
- **Step 1: Text Span Extraction**:
  - Uses `pdfjs-dist` page text extraction to get all text items: `{ str, x, y, width, height }`.
- **Step 2: Dark Rectangle / Blackout Operator Detection**:
  - Analyzes the page content stream or annotation layer (`/Square`, `/Highlight`, or vector paths with fill color `rg 0 0 0` / `k 0 0 0 1` / dark RGB < 30).
  - Also inspects visual canvas pixels: identifies solid dark blocks (width > 20px, height > 8px, luminance < 0.1).
- **Step 3: Intersection & Leak Scoring**:
  - Compares text bounding boxes against detected dark rectangle regions.
  - If a text span's center `(x + w/2, y + h/2)` falls inside a dark rectangle, the text is flagged as `trappedText`.
  - Calculates leak score: `totalLeakedSpans`, list of leaked strings (e.g., `["SSN: 123-45-6789", "CONFIDENTIAL ACQUISITION PRICE: $4.2B"]`).

### 2.2 Forensic Sanitization & Hard Purge
- When the user clicks "Purge Leaked Text & Sanitize":
  - `pdf-lib` creates a clean version:
  - Draws true opaque blackout boxes on top AND removes the underlying text using vector path clipping or replacement of target characters with spaces in the content stream.
  - Flattens annotations into the base page stream.
  - Strips metadata (`Author`, `Title`, `Subject`, `Keywords`, `Producer`) to prevent metadata cross-leakage.

## 3. UI/UX Interface (`VerifyRedactionPdfIsland.astro`)
- **Specimen Dropzone**: Upload legal contract, court filing, or redacted document.
- **Status Dashboard**:
  - Big Red Banner if Leaks Detected: `"CRITICAL: 14 Leaked Text Spans Found Beneath Black Boxes!"`
  - Big Green Banner if Clean: `"PASSED: Zero Underlying Text Found Beneath Redactions."`
- **Interactive X-Ray Viewer**:
  - Shows page preview with toggle:
    - Normal View (looks blacked out).
    - Forensic X-Ray View (black boxes turn translucent neon red, glowing yellow text reveals what is secretly hiding underneath).
- **Leaked Text Inspector Table**:
  - Lists every leaked phrase found beneath redaction boxes with Page # and coordinates.
- **Action Buttons**:
  - "Purge & Sanitize PDF (Court-Ready)" -> Exports 100% leak-proof sanitized PDF.
  - "Export Forensic Audit Log (JSON)" -> Diagnostic proof report.
