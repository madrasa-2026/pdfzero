# Legal Bates Numbering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 100% in-browser Legal Bates Numbering tool (`/tools/bates-numbering`) on AirPDF that stamps sequential alphanumeric identification codes (prefix, zero-padded number, suffix) onto multi-page PDF documents across 6 anchor positions without server uploads.

**Architecture:** Client-side Astro Island (`BatesNumberingIsland.astro`) orchestrating a vector stamping engine (`src/lib/pdf/bates.ts`).

**Tech Stack:** Astro, TypeScript, Tailwind CSS, `pdf-lib`, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-18-bates-numbering-design.md`

## Global Constraints
- **100% In-Browser:** Zero server uploads, zero network leaks.
- **Crystal Clear Vector Stamping:** Uses `pdf-lib` vector font embedding without rasterizing pages.
- **Accurate Coordinates:** Accurately anchors to Top/Bottom, Left/Center/Right respecting custom margins.
- **Dual Audit Loop:** AI code & security audit + Human UX audit before advancing to next tool.

---

### Task 1: Core Bates Numbering Engine
**Files:**
- Create: `src/lib/pdf/bates.ts`
- Test: `tests/pdf/bates.test.ts`

- [ ] **Step 1: Write failing unit tests for Bates formatting and coordinate positioning**
- [ ] **Step 2: Implement formatting, coordinate computation, and vector stamping**
- [ ] **Step 3: Run Vitest and confirm all tests pass**

---

### Task 2: Content Collection Entry & SEO Schema
**Files:**
- Create: `src/content/tools/bates-numbering.md`

- [ ] **Step 1: Create Markdown file with title, meta tags, how-to steps, and FAQs**

---

### Task 3: Interactive UI Island
**Files:**
- Create: `src/components/tools/BatesNumberingIsland.astro`

- [ ] **Step 1: Implement dropzone, prefix/digits/suffix form, 6-way position selector, live range indicator, and 1-click clean download**

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
- [ ] **Step 2: Human UX & Visual Audit (dropzone, position selection, range preview, clean download, mobile responsiveness)**
- [ ] **Step 3: Conclude Tool 6 and advance loop to Tool 7 (Grayscale PDF)**
