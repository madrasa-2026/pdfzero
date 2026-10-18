# Feature Specification: PDF DPI Downsampler & Image Compression Tuner (`/tools/downsample-pdf`)

## 1. Problem Statement & User Value
Scanned documents, phone camera uploads, brochures, medical records, and legal briefs often result in massive 50MB–200MB PDF files because scanners and modern cameras embed raw uncompressed 600–1200 DPI images.

Most basic "PDF compress" tools use crude global recompression that blurs text, introduces compression artifacts, or barely saves 5% of file size. Commercial prepress tools like Adobe Acrobat Pro PDF Optimizer ($239/year) and Enfocus PitStop ($700+) charge huge license fees for true image DPI downsampling. Free online tools upload confidential tax documents and medical scans to remote servers.

**AirPDF Solution**:
A 100% Free, Client-Side PDF DPI Downsampler & Image Optimizer. It inspects all embedded image XObjects, computes effective DPI against page display bounding boxes, downsamples oversized images to target DPI thresholds (72 DPI Web, 150 DPI Print, or 300 DPI Archive) with customizable JPEG quality, and re-injects optimized streams—leaving all vector paths, typography, and searchable text 100% vector-sharp and untouched.

## 2. Downsampling Architecture & Algorithm (`src/lib/pdf/downsampler.ts`)
1. **Locate Embedded Image XObjects**:
   Traverse document PDF objects for dictionaries matching `/Subtype /Image`.
2. **Compute Effective Display DPI**:
   Determine displayed dimensions $(w_{pt}, h_{pt})$ on referencing pages from operator streams `q [w 0 0 h x y] cm /ImageName Do Q`.
   $\text{DPI}_{eff} = \max\left(\frac{W_{px}}{w_{pt}/72}, \frac{H_{px}}{h_{pt}/72}\right)$.
3. **Target Resizing**:
   If $\text{DPI}_{eff} > \text{Target DPI}$ (e.g. 72, 150, 300):
   $\text{New Width} = \text{round}(w_{pt} / 72 \times \text{Target DPI})$
   $\text{New Height} = \text{round}(h_{pt} / 72 \times \text{Target DPI})$
4. **Image Re-Encoding**:
   Downscale image using bicubic interpolation on in-memory canvas and encode to optimized JPEG or Flate stream.
   Replace `/Width`, `/Height`, `/ColorSpace`, `/BitsPerComponent`, and stream contents in the image dictionary.
5. **Vector & Text Integrity**:
   Because only raster XObject streams are modified, all text characters, fonts, and vector illustrations retain infinite zoom fidelity.

## 3. Supported Optimization Presets
- **Screen / Email (72 DPI, Quality 65%)**: Extreme size reduction (typically 75%–90% reduction) for email attachments and portal uploads.
- **Office / Reading (150 DPI, Quality 75%)**: Ideal for reading on Retina screens and standard office printing.
- **Archive / High Print (300 DPI, Quality 85%)**: High-resolution print preservation while eliminating 600+ DPI scanner bloat.
- **Custom Mode**: Independent control over Target DPI (50–600 DPI) and JPEG Quality (40%–95%).

## 4. Security & Privacy
- 100% Client-side execution in browser memory.
- Confidential medical, legal, and financial scans never leave the user's computer.
