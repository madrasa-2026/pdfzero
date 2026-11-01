# Spec: PDF to PDF/A ISO Archival Converter (/tools/pdf-to-pdfa)

## 1. Problem Statement & Value Proposition
Legal courts (PACER in the US, e-Courts in the EU), academic institutions (dissertation repositories), government tax agencies, and enterprise archives mandate **ISO 19005 compliant PDF/A** format. Standard PDFs are rejected because they rely on external font environments and device-dependent color spaces that may render differently in 20 or 50 years.

On **iLovePDF**, "PDF to PDF/A" is locked as an exclusive **PREMIUM-ONLY** tool ($48–$84/year). Adobe Acrobat Pro charges $239/year.

AirPDF's **PDF to PDF/A Converter** provides 100% free, client-side, unlimited conversion to:
- **PDF/A-1b** (ISO 19005-1:2005 Level B: Basic visual preservation)
- **PDF/A-2b** (ISO 19005-2:2011 Level B: Supports transparencies and modern layers)
- **PDF/A-3b** (ISO 19005-3:2012 Level B: Electronic invoice / ZUGFeRD / Factur-X attachment compliant)

All executed 100% locally in browser memory with zero server uploads.

---

## 2. Technical Architecture & ISO Compliance

### 2.1 PDF/A Transformation Pipeline
1. **Device-Independent Color Space & OutputIntent**:
   - Injects `/OutputIntents` array into Document Catalog (`/Root`).
   - Declares `/S /GTS_PDFA1` for PDF/A-1 or `/S /GTS_PDFA2` for PDF/A-2.
   - Sets standard sRGB profile identifier `sRGB IEC61966-2.1` and registry `http://www.color.org`.
2. **Standardized ISO XMP Metadata Stream**:
   - Embeds XML metadata stream (`/Type /Metadata /Subtype /XML`).
   - Defines `pdfaid:part` (1, 2, or 3) and `pdfaid:conformance` (`B`).
   - Adds Dublin Core (`dc:format application/pdf`, `dc:title`, `dc:date`).
   - Sets PDF producer and creation/modification timestamps.
3. **Document Catalog Flagging**:
   - Sets `/MarkInfo << /Marked true >>` in `/Root`.
4. **Disallowed Object Sanitization**:
   - Strips non-compliant interactive JavaScript launch actions.
   - Removes obsolete encryption dictionaries (PDF/A strictly forbids encryption passwords).

### 2.2 Data Contract
```typescript
export type PdfAProfile = 'PDF/A-1b' | 'PDF/A-2b' | 'PDF/A-3b';

export interface PdfAOptions {
  profile?: PdfAProfile; // default: 'PDF/A-2b'
  title?: string;
  author?: string;
}

export interface PdfAResult {
  pdfBytes: Uint8Array;
  profile: PdfAProfile;
  isoStandard: string;
  pagesCount: number;
  originalSizeBytes: number;
  outputSizeBytes: number;
}
```

---

## 3. Interactive Island UI
- Dropzone with drag & drop support.
- Profile Selector:
  - **PDF/A-2b (Recommended)**: Modern standard, supports alpha transparencies and vector drop shadows.
  - **PDF/A-1b (Legacy Legal & Government)**: Maximum compatibility for older court portals and tax submission engines.
  - **PDF/A-3b (Invoicing & Enterprise)**: Supports embedded electronic billing records.
- Document Metadata configuration (Document Title, Author, Archival Subject).
- Compliance checklist badge readout:
  - ✓ Device-Independent sRGB OutputIntent
  - ✓ ISO 19005 XMP Identification Schema
  - ✓ Password Encryption Disallowed & Sanitized
  - ✓ Cleaned Interactive Launch Actions
- 1-Click "Convert to ISO PDF/A" button with instant download.

---

## 4. Quality & Audit Gates
- Unit test suite verifying OutputIntent creation, XMP stream generation, and metadata dictionary injection across all 3 profiles.
- Vitest and Astro static build verification.
- SEO & Semantic Schemas: WebApplication, FAQPage, and HowTo.
- Dual audit verification on production deployments (`airpdf.pages.dev` and `pdfzero.pages.dev`).
