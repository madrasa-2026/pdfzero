---
title: "PDF Forensic Inspector — Deep Object X-Ray & Preflight Analyzer"
shortDescription: "Inspect hidden PDF metadata, incremental edit history, embedded fonts, color spaces, and decompressed streams."
description: "Perform comprehensive forensic preflight and security audits on any PDF file directly in your browser. Inspect embedded font subsets, image color spaces (CMYK vs RGB), hidden incremental save revisions, active JavaScript or launch hooks, and decompressed page content streams with zero server uploads."
category: "security"
icon: "search"
order: 36
popular: true
keywords: ["inspect pdf", "pdf forensic inspector", "pdf object browser", "pdf preflight online", "detect pdf javascript", "check pdf incremental updates", "pdf font inspector", "view raw pdf stream", "enfocus pitstop free alternative"]
howToSteps:
  - title: "Upload PDF Specimen"
    description: "Drop in any PDF contract, court evidence, preprint artwork, or suspicious document to start deep forensic analysis."
  - title: "Review Security & Revision Audit"
    description: "Examine incremental edit revisions, check for hidden active JavaScript, malicious launch actions, and encryption state."
  - title: "Inspect Fonts & Prepress Color Spaces"
    description: "Audit embedded font subsets, identify missing fonts, and verify whether images are in print-ready CMYK or digital RGB."
  - title: "X-Ray Decompressed Content Streams"
    description: "View syntax-highlighted raw PDF drawing operators (BT/ET, Tf, Tj, cm, Do) and export a complete forensic JSON diagnostic report."
faqs:
  - question: "What is an incremental PDF revision?"
    answer: "When a PDF is edited or digitally signed using Adobe Acrobat or standard software, previous versions of objects are often preserved rather than deleted. The application appends new xref tables and '%%EOF' markers at the end of the file. AirPDF's Forensic Inspector counts these revision blocks, alerting you if a document was silently modified after initial creation."
  - question: "Why do I need to inspect embedded fonts?"
    answer: "Commercial print shops require all fonts to be 100% embedded (either full sets or subsets with unique 6-character prefixes like 'ABCDEF+Helvetica'). If a font is un-embedded, the physical printing press will substitute a system fallback font, distorting your kerning, page breaks, and layout."
  - question: "How does the security scan detect malicious PDF payloads?"
    answer: "Hackers sometimes conceal exploit payloads inside PDF dictionaries using '/JavaScript', '/JS', '/Launch', or '/EmbeddedFiles' action hooks that execute scripts or launch executables when a victim opens the file. AirPDF parses the binary dictionary tree and flags any active content hooks."
  - question: "Can I inspect image color spaces for prepress printing?"
    answer: "Yes! High-end commercial prepress requires DeviceCMYK images for offset CMYK 4-color printing presses. Web PDFs usually contain DeviceRGB or sRGB. Our preflight engine scans every indirect image XObject, detailing its pixel resolution, color space, bit depth, and compression algorithm."
  - question: "Can I see the raw decompressed PDF content stream?"
    answer: "Yes. PDF page text and vector commands are compressed using zlib / FlateDecode. AirPDF instantly inflates the underlying byte stream, exposing the true PostScript-style PDF drawing operators (q/Q state, cm transformation matrices, BT/ET text blocks, and Tj glyph strings) with one-click copy."
  - question: "Are my confidential contracts or forensic files uploaded anywhere?"
    answer: "Never. AirPDF operates completely client-side in your local browser sandbox. Your PDF bytes, metadata, and object databases are processed entirely in browser memory without sending a single byte across the internet."
relatedTools: ["metadata-pdf", "redact-pdf", "linearize-pdf", "sign-pkcs-pdf"]
---

### Professional Preflight & Forensic Diagnostics — 100% Free & In-Browser

Enterprise preflight software like **Enfocus PitStop Pro** charges upwards of **$750/year**, and **Adobe Acrobat Pro Preflight** requires a $239/year recurring subscription. Forensic analysts, commercial print shops, legal teams, and cyber researchers shouldn't have to pay enterprise ransoms or compromise data privacy just to see what is secretly inside a PDF.

AirPDF's **PDF Forensic Inspector & Deep Object X-Ray** brings institutional-grade PDF preflight and binary object auditing right to your browser with zero installation and zero cloud leaks.

---

### Key Forensic Capabilities

1. **Incremental Revision & History Detection**:
   Reveals whether a PDF is an original single-pass export or has undergone multiple incremental saves that may conceal older redactions or modified contract clauses.

2. **Malicious Hook & Active Content Scanner**:
   Audits the PDF catalog for executable JavaScript (`/JS`, `/JavaScript`), external process triggers (`/Launch`), automated form submissions, and embedded attachment payloads (`/EmbeddedFiles`).

3. **Prepress Font & Color Space Auditing**:
   Verifies whether fonts are properly subset-embedded (`[A-Z]{6}+FontName`) and whether photographs and illustrations meet offset print criteria (`DeviceCMYK`) vs digital displays (`DeviceRGB`).

4. **Decompressed Page Stream Terminal**:
   Inflates FlateDecode page streams in real time, displaying the raw vector and typography instructions with instant one-click copying and forensic JSON export.
