# True PDF Redactor & Metadata Sanitizer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 100% in-browser True PDF Redactor & Metadata Sanitizer tool (`/tools/redact-pdf`) on AirPDF that permanently purges sensitive text from underlying PDF streams, wipes document metadata fingerprints, and applies permanent visual masks without server uploads.

**Architecture:** Client-side Astro Island (`RedactPdfIsland.astro`) orchestrating a stream-level redaction and metadata sanitization engine (`src/lib/pdf/redact.ts`).

**Tech Stack:** Astro, TypeScript, Tailwind CSS, `pdf-lib`, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-18-redact-pdf-design.md`

## Global Constraints
- **100% In-Browser:** Zero server uploads, zero network leaks.
- **True Redaction (Stream Eradication):** Redacted text MUST NOT remain underneath visual masks. The underlying characters must be deleted from the stream so they cannot be copied, selected, or uncovered.
- **Complete Metadata Sanitization:** Scrubs `/Info` dictionary (Author, Producer, Creation Date) and `/Metadata` XMP stream.
- **Dual Audit Loop:** AI code & security audit + Human UX audit before advancing to next tool.

---

### Task 1: Core Redaction & Sanitization Engine
**Files:**
- Create: `src/lib/pdf/redact.ts`
- Test: `tests/pdf/redact.test.ts`

- [ ] **Step 1: Write failing unit tests for true stream text eradication and metadata sanitization**
- [ ] **Step 2: Implement stream eradication, regex pattern matching, and metadata scrubbing**
- [ ] **Step 3: Run Vitest and confirm all tests pass**

---

### Task 2: Content Collection Entry & SEO Schema
**Files:**
- Create: `src/content/tools/redact-pdf.md`

- [ ] **Step 1: Create Markdown file with title, meta tags, how-to steps, and FAQs**

---

### Task 3: Interactive UI Island
**Files:**
- Create: `src/components/tools/RedactPdfIsland.astro`

- [ ] **Step 1: Implement dropzone, pattern checkboxes (SSN, Email, Phone, Credit Card), custom term input, blackout/whiteout toggle, and 1-click clean download**

---

### Task 4: Routing & Navigation
**Files:**
- Modify: `src/pages/tools/[slug].astro`
- Modify: `src/components/layout/Footer.astro`
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Connect island in `[slug].astro`**
- [ ] **Step 2: Add tool link to Footer and Homepage Tools Grid**

---

### Task 5: Build, Test & Deploy
- [ ] **Step 1: Run `npm run test` (all tests passing)**
- [ ] **Step 2: Run `npm run build`**
- [ ] **Step 3: Deploy to Cloudflare Pages (`airpdf.pages.dev` & `pdfzero.pages.dev`)**

---

### Task 6: Dual Audit (Human UX + AI Code/Security)
- [ ] **Step 1: AI Code, Security & Schema Audit (live network check, JSON-LD, zero server leaks)**
- [ ] **Step 2: Human UX & Visual Audit (dropzone, live text eradication, clean download, mobile responsiveness)**
- [ ] **Step 3: Conclude Tool 4 and advance loop to Tool 5**
