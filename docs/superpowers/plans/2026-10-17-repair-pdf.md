# PDF Repair & Content Rescuer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dedicated, 100% client-side PDF Repair & Content Rescuer tool (`/tools/repair-pdf`) on AirPDF that scans damaged, truncated, or broken PDF byte streams, rebuilds cross-reference tables and missing trailers, salvages intact pages, and outputs a clean, standards-compliant PDF without server uploads.

**Architecture:** Pure client-side Astro Island (`RepairPdfIsland.astro`) orchestrating a binary stream reconstruction engine (`src/lib/pdf/repair.ts`). The engine normalizes binary headers, scans for raw PDF indirect objects, recalculates exact byte offsets to synthesize a valid XRef table, and performs page-by-page transfusion into a clean `PDFDocument`.

**Tech Stack:** Astro, TypeScript, Tailwind CSS, `pdf-lib-with-encrypt`, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-17-repair-pdf-design.md`

## Global Constraints

- **Execution Model:** 100% client-side execution in browser memory. Zero file bytes uploaded to external servers.
- **Tolerant Recovery:** Must salvage intact pages even when the cross-reference table, trailer, or single pages are corrupted.
- **Honest Diagnostics:** Clearly reports which repairs were applied (e.g. header normalized, XRef reconstructed, missing EOF restored) and exact number of pages recovered.
- **Zero Size Cap:** No artificial file size limits.
- **Dual Audit Gate:** Every tool deployment must pass both a Human UX/UI audit and an AI Code/Security audit before advancing to the next tool.

## Review Focus

1. **Byte Boundary Integrity:** Trimming leading junk must strictly preserve binary stream offsets for internal compressed streams.
2. **Object Scanner Robustness:** Regex / byte scanning must handle irregular whitespace and various PDF object declarations (`obj`, `endobj`, stream lengths).
3. **Graceful Failure on Non-PDFs:** If a completely unrelated binary (e.g. an MP3 or empty file) is uploaded, the engine must return a clean, friendly error instead of crashing.
4. **Memory Hygiene:** Large array buffers must not be duplicated unnecessarily in memory during scanning.
5. **Mobile Viewport Responsiveness:** Diagnostic cards and download actions must render cleanly on narrow screens (< 375px).

---

### Task 1: Core PDF Repair & Content Rescuer Engine

**Files:**
- Create: `src/lib/pdf/repair.ts`
- Test: `tests/pdf/repair.test.ts`

**Interfaces:**
```typescript
export interface RepairReport {
  repairedBytes: Uint8Array;
  originalSize: number;
  repairedSize: number;
  pagesRecovered: number;
  fixesApplied: string[];
  isFullyRestored: boolean;
}

export function sanitizePdfHeader(bytes: Uint8Array): { bytes: Uint8Array; fixed: boolean };
export function repairMissingEof(bytes: Uint8Array): { bytes: Uint8Array; fixed: boolean };
export function rebuildXrefTable(bytes: Uint8Array): { bytes: Uint8Array; fixed: boolean };
export async function repairPdf(
  file: File,
  onProgress?: (progress: { message: string; percent: number }) => void
): Promise<RepairReport>;
```

- [ ] **Step 1: Write failing unit tests for PDF repair engine**

Create `tests/pdf/repair.test.ts` testing:
- Normalizing a PDF with leading server junk bytes (`HTTP/1.1 200 OK\r\n\r\n%PDF-1.4...`).
- Repairing a PDF truncated before `%%EOF`.
- Rebuilding a corrupted XRef table so `PDFDocument.load()` succeeds.
- Returning an honest `RepairReport` with list of applied fixes.

- [ ] **Step 2: Run test to confirm it fails**

Run `npm run test tests/pdf/repair.test.ts`.

- [ ] **Step 3: Implement `src/lib/pdf/repair.ts`**

Write header sanitization, EOF reconstruction, raw object scanner, XRef synthesis, and page transfusion logic.

- [ ] **Step 4: Run test to confirm all pass**

Run `npm run test tests/pdf/repair.test.ts`.

- [ ] **Step 5: Commit changes**

Commit with message: `feat(repair): implement core PDF repair and content rescuer engine`.

---

### Task 2: SEO Content Collection & Structured Data

**Files:**
- Create: `src/content/tools/repair-pdf.md`

**Content Requirements:**
- Title: `PDF Repair & Content Rescuer — Fix Corrupted or Damaged PDFs`
- Description: `Repair damaged, unopenable, or corrupted PDF files directly in your browser. Rebuild broken XRef tables, restore missing trailers, and salvage pages with zero cloud uploads.`
- FAQs:
  1. *How does in-browser PDF repair work?*
  2. *What causes PDFs to get corrupted?*
  3. *Can all damaged PDFs be fixed?*
  4. *Is my damaged file uploaded to external servers?*
  5. *Will repairing the PDF reduce document visual quality?*

- [ ] **Step 1: Create `src/content/tools/repair-pdf.md`**
- [ ] **Step 2: Verify frontmatter validation via `npm run build`**
- [ ] **Step 3: Commit changes**

Commit with message: `content(repair): add repair-pdf content collection entry`.

---

### Task 3: Interactive UI Island (`RepairPdfIsland.astro`) & Route Wiring

**Files:**
- Create: `src/components/tools/RepairPdfIsland.astro`
- Modify: `src/pages/tools/[slug].astro`

**UI States:**
1. **Dropzone:** Drag-and-drop or file picker with *"100% In-Browser"*, *"Zero Uploads"*, *"No Size Cap"*.
2. **Live Repairing State:** Animated wrench/shield icon with progress updates.
3. **Diagnostic Report Card:**
   - Pages salvaged counter.
   - List of fixes applied.
   - File size comparison.
   - 1-click **Download Repaired PDF**.
4. **Wire up in `src/pages/tools/[slug].astro`**.

- [ ] **Step 1: Create `src/components/tools/RepairPdfIsland.astro`**
- [ ] **Step 2: Wire up in `src/pages/tools/[slug].astro`**
- [ ] **Step 3: Run `npm run build` to verify compilation**
- [ ] **Step 4: Commit changes**

Commit with message: `feat(repair): implement RepairPdfIsland and wire route`.

---

### Task 4: Navigation Integration & Cross-Linking

**Files:**
- Modify: `src/components/layout/Header.astro`
- Modify: `src/components/layout/Footer.astro`
- Modify: `src/pages/index.astro`

**Changes:**
1. Add "Repair PDF" to Footer under Core Tools.
2. Add "Repair PDF" card to Homepage Tools Grid under "Optimize" or "Security".
3. Add wrench icon path to `categoryIcons`.

- [ ] **Step 1: Update Header, Footer, and Homepage**
- [ ] **Step 2: Run `npm run test` and `npm run build`**
- [ ] **Step 3: Commit changes**

Commit with message: `feat(nav): integrate repair-pdf into navigation and homepage grid`.

---

### Task 5: Production Deployment & Dual Audit

- [ ] **Step 1: Deploy to Cloudflare Pages (`airpdf` and `pdfzero`)**
- [ ] **Step 2: AI Code & Security Audit**
  - Verify test suite (all tests pass).
  - Verify zero external network calls during repair.
  - Verify valid JSON-LD schema markup.
- [ ] **Step 3: Human UX/UI Audit**
  - Verify layout, dropzone, mobile responsiveness, diagnostic card on live production URL.
- [ ] **Step 4: Push git commits**
