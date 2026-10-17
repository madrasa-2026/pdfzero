# PDF Watermark & Stamp Remover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 100% in-browser, privacy-preserving PDF Watermark & Stamp Remover tool (`/tools/remove-watermark`) on AirPDF that detects and removes watermark annotations, transparent overlay layers, XObjects, and stamped keywords without rasterizing pages or losing text selectability.

**Architecture:** Client-side Astro Island (`RemoveWatermarkIsland.astro`) orchestrating a multi-strategy PDF stream parsing engine (`src/lib/pdf/watermark.ts`).

**Tech Stack:** Astro, TypeScript, Tailwind CSS, `pdf-lib-with-encrypt`, PDF.js, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-17-remove-watermark-design.md`

## Global Constraints
- **100% In-Browser:** Zero server uploads, zero network leaks.
- **Lossless / Non-Destructive:** Document text, vector shapes, fonts, and links must remain selectable and un-rasterized.
- **Customizable:** Automatic removal of standard watermarks with optional user-targeted keyword / pattern removal.
- **Dual Audit Loop:** AI security & code audit + Human UX audit before advancing to next tool.

---

### Task 1: Core Watermark Removal Engine
**Files:**
- Create: `src/lib/pdf/watermark.ts`
- Test: `tests/pdf/watermark.test.ts`

- [ ] **Step 1: Write failing unit tests for watermark detection and stripping**
- [ ] **Step 2: Implement watermark detection and removal functions**
- [ ] **Step 3: Run Vitest and confirm all tests pass**

---

### Task 2: Content Collection & SEO
**Files:**
- Create: `src/content/tools/remove-watermark.md`

- [ ] **Step 1: Create Markdown file with title, meta tags, how-to steps, and FAQs**

---

### Task 3: Interactive UI Island
**Files:**
- Create: `src/components/tools/RemoveWatermarkIsland.astro`

- [ ] **Step 1: Implement dropzone, scanner card, filter toggles, live canvas preview, and download button**

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
- [ ] **Step 2: Human UX & Visual Audit (dropzone, live preview, clean download, mobile responsiveness)**
- [ ] **Step 3: Conclude Tool 2 and advance loop to Tool 3**
