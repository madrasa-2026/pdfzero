# Specification: HTML & Code to PDF Converter (`/tools/html-to-pdf`)

## 1. Overview
The **HTML to PDF Converter** allows users to transform raw HTML, CSS, webpage markup, and document templates into clean, printable, vector-accurate PDF files directly inside the browser.

On **iLovePDF**, "HTML to PDF" is marked with a gold **PREMIUM** badge ($48–$84/year), requiring users to register an account and send raw HTML to remote third-party servers.

AirPDF's **HTML to PDF** operates 100% client-side:
- Paste raw HTML + CSS or upload `.html` / `.htm` files.
- Real-time live split-pane preview with live syntax rendering.
- Pre-loaded professional templates:
  - Professional Invoice
  - Modern Resume / CV
  - Technical Documentation / Code Spec
  - Academic Article
- Formatting configurations:
  - Paper Sizes: A4 (210 x 297 mm), US Letter (8.5 x 11 in), Legal (8.5 x 14 in).
  - Page Orientation: Portrait vs Landscape.
  - Margins: None (0mm), Compact (10mm), Standard (20mm), Wide (30mm).
  - Background Graphics: Toggle on/off (`-webkit-print-color-adjust: exact`).
- Dual Export Pipeline:
  1. **Direct Vector PDF Print Engine**: Employs `@media print` CSS and isolated sandbox printing for pixel-perfect, searchable, selectable text.
  2. **Direct Client-Side PDF File Export**: Converts rendered DOM nodes into high-density pagination chunks embedded into standard ISO PDF pages via `pdf-lib`.
- 100% Client-Side Privacy: Zero server uploads, zero API limits.

## 2. Architecture
- **Engine (`src/lib/pdf/htmlEngine.ts`)**:
  - `generatePrintableHtml(html, css, options)`: Sanitizes markup, injects `@page` sizing rules, margin definitions, and background print CSS.
  - `createPdfFromHtmlCanvas(canvasPages, paperSize)`: Builds PDF from multi-page rendered canvas buffers via `pdf-lib`.
  - Built-in starter templates for invoice, resume, and technical report.
- **Island Component (`src/components/tools/HtmlToPdfIsland.astro`)**:
  - Split-pane editor: Code editor on left, responsive live preview frame on right.
  - Template picker dropdown.
  - Paper size, margin, and orientation toggles.
  - Direct Download button and Vector Print button.
