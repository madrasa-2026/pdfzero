# PDF Form Flattener Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 100% in-browser, lossless PDF Form Flattener tool (`/tools/flatten-pdf`) on AirPDF that locks fillable form fields, checkboxes, and signatures into permanent vector page content, making documents immutable and archival-ready without server uploads.

**Architecture:** Client-side Astro Island (`FlattenPdfIsland.astro`) orchestrating an AcroForm flattening and widget purging engine (`src/lib/pdf/flatten.ts`).

**Tech Stack:** Astro, TypeScript, Tailwind CSS, `pdf-lib`, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-18-flatten-pdf-design.md`

## Global Constraints
- **100% In-Browser:** Zero server uploads, zero network leaks.
- **Lossless Flattening:** Form values must be baked into the page vector stream; no blurry rasterization.
- **AcroForm Purging:** Interactive widgets and form fields must be stripped so the document becomes immutable.
- **Dual Audit Loop:** AI code & security audit + Human UX audit before declaring suite complete.

---

### Task 1: Core Form Flattening Engine
**Files:**
- Create: `src/lib/pdf/flatten.ts`
- Test: `tests/pdf/flatten.test.ts`

- [ ] **Step 1: Write failing unit tests for form field detection and flattening**
- [ ] **Step 2: Implement form field inspection and vector flattening**
- [ ] **Step 3: Run Vitest and confirm all tests pass**

---

### Task 2: Content Collection Entry & SEO Schema
**Files:**
- Create: `src/content/tools/flatten-pdf.md`

- [ ] **Step 1: Create Markdown file with title, meta tags, how-to steps, and FAQs**

---

### Task 3: Interactive UI Island
**Files:**
- Create: `src/components/tools/FlattenPdfIsland.astro`

- [ ] **Step 1: Implement dropzone, form field detector card, progress state, and 1-click clean download**

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
- [ ] **Step 2: Human UX & Visual Audit (dropzone, field detection, clean download, mobile responsiveness)**
- [ ] **Step 3: Conclude Tool 5 and complete the 5-Tool Roadmap**
