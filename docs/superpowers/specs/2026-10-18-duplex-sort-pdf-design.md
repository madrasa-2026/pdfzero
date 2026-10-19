# Spec: PDF Manual Duplex Printing Wizard & Reverse Interleaver (/tools/duplex-sort-pdf)

## 1. Problem Statement & Value Proposition
Desktop inkjet and laser printers (HP DeskJet, Canon PIXMA, Epson EcoTank, affordable Brother models) do not possess expensive internal duplexer turnaround units for automatic two-sided printing.
Users attempting manual two-sided printing face endless headaches:
1. Paper jam or misorder disasters: printing evens in forward order instead of reverse order when the printer delivers face-down.
2. Odd-page desynchronization: When a document has an odd number of pages (e.g. 19 pages), page 19 prints on the back of page 20, shifting every double-sided page pair in the entire document!
3. ADF Scanner Reverse Inversion: Scanning two-sided sheets via a single-pass document feeder results in two files (`fronts.pdf` in 1, 3, 5 order and `backs.pdf` in 6, 4, 2 inverted order), with no native way in Adobe Acrobat Reader to re-weave them into a single coherent document.

AirPDF's **PDF Manual Duplex Printing Wizard & Reverse Interleaver** provides:
- **Duplex Split Mode**: Splits any PDF into calibrated Step 1 (Front / Odd) and Step 2 (Back / Even) PDFs.
- **Smart Blank Padding**: Automatically appends a blank page if page count is odd, guaranteeing perfect front/back parity.
- **Printer Tray Presets**: Rear top-loading vs front cassette tray orientations, with forward or reverse even stack sequencing.
- **Scanner Interleaver Mode**: Merges separate Fronts and Backs scan files into a unified document with automatic reverse detection.
- **100% Client-Side Privacy**: Instant processing in browser RAM without server upload.

---

## 2. Technical Architecture & Algorithms

### 2.1 Duplex Splitting Engine
```typescript
export interface DuplexSplitOptions {
  reverseEvenStack?: boolean;   // default: true for face-down output trays
  padOddPageCount?: boolean;    // default: true (adds blank page if total is odd)
}

export interface DuplexSplitResult {
  step1OddBytes: Uint8Array;
  step2EvenBytes: Uint8Array;
  totalOriginalPages: number;
  oddPagesCount: number;
  evenPagesCount: number;
  wasPadded: boolean;
}
```

### 2.2 Scanner Interleaver Engine
```typescript
export interface InterleaveOptions {
  reverseSecondStack?: boolean; // default: true (scanners scan back side in reverse order)
}

export async function interleavePdfStreams(
  frontBytes: Uint8Array,
  backBytes: Uint8Array,
  options?: InterleaveOptions
): Promise<Uint8Array>;
```

---

## 3. Interactive Island UI
- Mode Tab Toggle:
  - **Tab 1: 🖨️ Duplex Print Wizard**: Upload 1 PDF -> Choose printer type -> Download Step 1 & Step 2 PDFs + Interactive Folding/Loading guide.
  - **Tab 2: 🔄 Scanner ADF Interleaver**: Upload Fronts PDF + Backs PDF -> 1-Click Interleave & Download single unified document.
- Visual step-by-step paper flip animation / graphic showing exactly how to place the paper back into the tray.

---

## 4. Quality & Audit Gates
- Unit test suite covering even/odd splitting, reverse ordering, blank page padding, and alternating interleaving.
- Full Vitest test suite and Astro static build verification.
- SEO & Semantic Schemas: WebApplication and FAQPage.
- Dual audit verification on production deployments (`airpdf.pages.dev` and `pdfzero.pages.dev`).
