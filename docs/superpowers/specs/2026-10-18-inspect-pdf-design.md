# Specification: PDF Forensic X-Ray & Deep Object Inspector (`/tools/inspect-pdf`)

## 1. Executive Summary & Market Context
PDF files are complex binary object databases containing hidden layers: incremental version histories, font subsets, color spaces, embedded scripts, attachments, and decompressed content streams.

Enfocus PitStop Pro charges **$750/year** for PDF preflight and object inspection. Adobe Acrobat Pro charges **$239/year** for Preflight diagnostics. Security analysts, prepress print shops, legal forensics teams, and curious users need a zero-install, 100% in-browser deep inspector.

**AirPDF Forensic X-Ray & Object Inspector** provides a free, instant, privacy-preserving preflight workstation that parses the internal PDF object model, exposes hidden metadata, flags security risks (launch actions, hidden scripts), inspects embedded fonts and color spaces, and decompresses page content streams.

## 2. Core Functional Requirements

### 2.1 Security & Forensic Analysis
- **Incremental Revision Detector**: Checks for multiple `%%EOF` and `startxref` markers. Identifies if the PDF has been modified/appended after creation, preserving previous versions.
- **Active Code & Malicious Hook Scanner**:
  - Embedded JavaScript (`/JS`, `/JavaScript`)
  - External Launch / Action hooks (`/Launch`, `/OpenAction`, `/AA`)
  - Embedded File Attachments (`/EmbeddedFiles`)
  - Interactive Forms & Signatures (`/AcroForm`, `/Sig`)

### 2.2 Prepress & Font X-Ray
- **Embedded Font Table**:
  - Font Name (e.g. `TimesNewRomanPSMT`, `ArialMT`)
  - Subtype (`Type0`, `TrueType`, `Type1`, `CIDFontType2`)
  - Subset Status (e.g., detected by standard 6-character prefix `[A-Z]{6}\+`)
  - Embedding Status (Embedded vs System Dependent)
- **Color Space & Image Preflight**:
  - Scans XObject images (`/Subtype /Image`)
  - Reports width, height, color space (`DeviceRGB`, `DeviceCMYK`, `DeviceGray`, `ICCBased`), bits per component, and compression filter (`FlateDecode`, `DCTDecode`, `JBIG2Decode`).

### 2.3 Object Tree & Content Stream Decompressor
- **Low-Level Indirect Object Browser**:
  - Traverses the PDF indirect object map (`n 0 obj ... endobj`).
  - Allows expanding the Root Catalog (`/Type /Catalog`), `/Pages`, `/Metadata`, and `/Info`.
- **Raw Stream Viewer**:
  - Flate-decompresses page `/Contents` and exposes the underlying raw PDF drawing operators (`q`, `Q`, `cm`, `BT`, `ET`, `Tf`, `Tj`, `re`, `f`, `Do`).
  - Formats syntax with syntax highlighting and instant "Copy Raw Stream" action.

## 3. Pure Engine Design (`src/lib/pdf/inspectEngine.ts`)
- `inspectPdfDocument(pdfBytes: Uint8Array): Promise<PdfInspectionReport>`
  - Uses `pdf-lib`'s low-level `context.enumerateIndirectObjects()` and byte scanning.
  - Returns structured report:
    - `summary`: PDF version (1.4, 1.7, 2.0), file size, page count, encrypted (`isEncrypted`), revision count (`revisionCount`).
    - `security`: `{ hasJavaScript, hasLaunchActions, hasEmbeddedFiles, hasAcroForm, hasSignatures, warnings: string[] }`.
    - `fonts`: Array of `{ name, subtype, isSubset, isEmbedded }`.
    - `images`: Array of `{ width, height, colorSpace, bitsPerComponent, filter }`.
    - `objectsCount`: Total indirect objects in xref table.
    - `sampleContentStream`?: Decoded text of Page 1 content stream.

## 4. UI/UX Interface (`InspectPdfIsland.astro`)
- Dropzone with dark forensic theme.
- Tabs:
  1. **Forensic Overview & Security**: Security badges (Green: Safe / Red: Risk detected), Revision timeline, Version, PDF/A compliance check.
  2. **Fonts & Prepress**: Font list table with subset tags; image color space breakdown (CMYK vs RGB for print).
  3. **Content Stream X-Ray**: Syntax-highlighted view of Page 1 raw PDF drawing commands with line numbers and copy button.
  4. **Object Map**: Summary of PDF indirect objects by type (`/Page`, `/Font`, `/XObject`, `/Metadata`, etc.).
- One-click "Export Forensic JSON Report" button.
