# Implementation Plan: PDF Redaction Leak Verifier & Purger (`/tools/verify-redaction-pdf`)

## Phase 1: Pure Engine (`src/lib/pdf/redactionVerifierEngine.ts`)
1. Define interfaces:
   - `TextSpan`: `{ text: string; x: number; y: number; width: number; height: number; pageNumber: number }`
   - `DarkBox`: `{ x: number; y: number; width: number; height: number; pageNumber: number }`
   - `LeakedTextFinding`: `{ pageNumber: number; text: string; box: DarkBox; confidence: number }`
   - `RedactionAuditReport`: `{ isCompromised: boolean; totalLeaks: number; findings: LeakedTextFinding[]; totalScannedPages: number; sanitized: boolean }`
2. Implement `findIntersectingTextLeaks(textSpans: TextSpan[], darkBoxes: DarkBox[]): LeakedTextFinding[]`:
   - Intersection test: checks if center or >50% of text span bounding box falls inside a dark box.
3. Implement `detectDarkBoxesFromImageData(data: Uint8ClampedArray, width: number, height: number, pageNumber: number): DarkBox[]`:
   - Identifies solid dark rectangular blocks (luminance < 35, width >= 25, height >= 8).
4. Implement `hardSanitizeRedactions(pdfBytes: Uint8Array, boxesToPurge: DarkBox[]): Promise<Uint8Array>`:
   - Uses `pdf-lib` to stamp permanent vector fill boxes and sanitize document metadata.

## Phase 2: Unit Testing (`tests/pdf/redactionVerifierEngine.test.ts`)
1. Test intersection math: accurately flags text span inside dark box and ignores text outside dark box.
2. Test dark box detection from synthetic canvas image with black redaction bar.
3. Test hard sanitization: stamps blackout box, clears metadata, and outputs valid PDF document.

## Phase 3: Content Collection Entry (`src/content/tools/verify-redaction-pdf.md`)
- Title: "PDF Redaction Leak Verifier — Detect & Fix Fake Blackout Boxes"
- Slug: `verify-redaction-pdf`
- Category: `security`
- Icon: `shield`
- How-to steps and 6 detailed FAQs.

## Phase 4: UI Island (`src/components/tools/VerifyRedactionPdfIsland.astro`)
- Specimen Dropzone.
- Big Alert Banner (Red: Leaks Detected / Green: Clean).
- Forensic X-Ray Toggle: turns black boxes translucent neon red to reveal underlying trapped text.
- Table of leaked text strings with one-click copy.
- "Hard Purge & Export Court-Ready PDF" button.

## Phase 5: Routing, Build, Deploy, and Dual Audit
- Add island to `src/pages/tools/[slug].astro`.
- Add link to `src/components/layout/Footer.astro` under Security & Convert.
- Run tests (`npm run test`).
- Run build (`npm run build`).
- Git commit & push.
- Cloudflare Pages deploy (`airpdf` and `pdfzero`) on `main`.
- Dual Audit.
