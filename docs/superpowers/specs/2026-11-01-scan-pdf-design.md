# Specification: Document Scanner & Perspective Warper (`/tools/scan-pdf`)

## 1. Overview
The **Document Scanner & Perspective Warper** turns smartphone camera photos or uploaded images of paper documents, receipts, IDs, and book pages into clean, flat, high-contrast, deskewed PDF files.

Features:
- Live Camera capture (Webcam / Mobile Camera) or drag-and-drop image upload (JPEG, PNG, WebP).
- 4-point interactive perspective warp (Homography) to correct angled/tilted photos into pristine flat rectangular documents.
- 4 Image Processing Filters:
  1. **Photocopy B&W**: High-contrast adaptive thresholding to convert paper to pure white background and text to solid black, removing room shadows.
  2. **Clean Grayscale**: Removes color tints while preserving smooth gradients and handwriting.
  3. **Vivid Color**: Enhances contrast and saturation for stamps, seals, and letterheads.
  4. **Original**: Unfiltered crisp image.
- Multi-page batch scanning: Capture or upload multiple pages into a single multi-page PDF.
- Paper format selection: Standard A4 (595.28 x 841.89 pt), US Letter (612 x 792 pt), or Auto (matches document aspect ratio).
- 100% client-side privacy: Zero cloud uploads, zero tracking.

## 2. Core Architecture
- **Perspective Homography Engine (`src/lib/pdf/scanEngine.ts`)**:
  - Solves the 3x3 projective transformation matrix from 4 quad points $(p_0, p_1, p_2, p_3)$ to destination rectangle $(0, 0, W, H)$.
  - Performs inverse projective warping onto target `ImageData` or canvas buffer.
  - Applies selected filter (B&W thresholding, grayscale, or contrast enhancement).
  - Compiles processed page buffers into a standardized PDF using `pdf-lib`.
- **UI Island (`src/components/tools/ScanPdfIsland.astro`)**:
  - Interactive SVG/Canvas overlay with 4 draggable corner handles.
  - Video stream preview modal for mobile camera capture with shutter button.
  - Page list reel (thumbnail preview, remove page, add page).
  - Filter toggle buttons and paper size selector.
  - Export button with real-time processing indicator.
