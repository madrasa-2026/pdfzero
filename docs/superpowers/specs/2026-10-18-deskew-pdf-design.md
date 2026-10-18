# Design Spec: In-Browser PDF Deskew & Straightener (`/tools/deskew-pdf`)

## 1. Problem Statement & Motivation
Scanned papers, mobile camera snaps, contracts, receipts, and archived records often have tilted, crooked, or rotated pages. Even a slight angle ($\pm 1^\circ$ to $\pm 5^\circ$) makes documents look sloppy, ruins presentation quality, and severely degrades OCR (optical character recognition) accuracy.

Commercial software like ABBYY FineReader and Adobe Acrobat Pro put automatic deskewing behind expensive desktop subscriptions (\$20–\$35/mo). Free web converters force users to upload sensitive contracts and financial records to third-party servers.

AirPDF delivers a **100% Free, Client-Side In-Browser PDF Deskew & Straightener** that detects tilt angles using horizontal projection profile variance, straightens pages via GPU-accelerated canvas transforms, and re-encodes clean, upright pages without server uploads.

## 2. Technical Architecture & Algorithm (`src/lib/pdf/deskew.ts`)

### Horizontal Projection Profile Analysis (Radon Transform Approximation)
1. **Downsampled Edge Map**:
   - For scanned pages, computes horizontal projection profiles across test rotation angles from $-15^\circ$ to $+15^\circ$ in fractional increments.
   - Text lines in horizontal alignment create alternating high-density peaks (text rows) and zero-density valleys (line spacing).
   - The angle that maximizes the variance $\sigma^2 = \frac{1}{H} \sum (P(y) - \bar{P})^2$ represents the dominant text orientation angle.
2. **Deskew Transformation & Vector Canvas Rebuilding**:
   - For scanned image pages: rotates the image canvas by $-\theta$ with bicubic interpolation, anti-aliased borders, and white canvas background padding.
   - For vector PDF pages: applies an inverse rotation coordinate transform matrix, ensuring text and vector art are properly aligned.
3. **Manual Fine-Tuning Slider**:
   - Provides a live interactive angle slider with $0.1^\circ$ precision so users can visually straighten pages against an alignment grid overlay.

## 3. UI/UX Interface (`src/components/tools/DeskewPdfIsland.astro`)
1. **Dropzone**: Drag & drop PDF file.
2. **Interactive Deskew Viewport**:
   - Interactive canvas preview showing the current page.
   - Toggleable **Alignment Grid (Rule Lines)** overlay to easily judge horizontal alignment.
   - **Auto-Detect Skew** button with instant angle calculation badge (`Detected: -2.4°`).
   - Fine-tuning rotation slider with $-15.0^\circ$ to $+15.0^\circ$ range ($0.1^\circ$ step) and quick presets (`-5°`, `-2°`, `0°`, `+2°`, `+5°`).
   - Page navigation controls (`< Page X of Y >`) with "Apply to This Page" or "Apply to All Pages".
3. **Processing & Download**:
   - Real-time straightening and fast in-memory compilation.
   - Instant download button (`document-straightened.pdf`).
