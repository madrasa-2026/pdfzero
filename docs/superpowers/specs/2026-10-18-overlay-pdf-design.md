# Feature Specification: PDF Page Overlay & Letterhead Stamper (`/tools/overlay-pdf`)

## 1. Problem Statement & User Value
Businesses, law firms, universities, and individual professionals routinely need to:
1. Apply corporate letterhead stationery to plain contracts or invoices.
2. Stamp "DRAFT", "CONFIDENTIAL", or approved seals across documents with custom opacity.
3. Merge decorative background templates, lined/grid paper, or legal pleading paper behind existing document pages.

Commercial tools like Adobe Acrobat Pro and Sejda charge $15–$25/month for letterhead overlay and page compositing.
**AirPDF Solution**:
A 100% Free, Client-Side PDF Page Overlay & Letterhead Stamper that composites stationery or stamps onto target PDFs in-browser with zero server uploads.

## 2. Key Capabilities
1. **Compositing Layers**:
   - **Underlay (Background / Letterhead)**: Draws the template layer underneath the target document content.
   - **Overlay (Foreground / Watermark Stamp)**: Stamps the template on top with adjustable opacity (10%–100%).
2. **Page Range Targeting**:
   - `all`: Stamp every page in the target document.
   - `first`: Apply only to page 1 (standard corporate letterhead behavior).
   - `custom`: Specify custom page ranges (e.g. `1, 3-5`, `odd`, `even`).
3. **Scaling & Aspect Ratio**:
   - `fit`: Scales the template page to match target page width & height.
   - `center`: Centers template page at its native size.
4. **Multi-Page Template Handling**:
   - Single-page template repeats across all matching target pages.
   - Multi-page template can map 1-to-1 onto corresponding target pages.

## 3. Technical Architecture (`src/lib/pdf/overlay.ts`)
Using `pdf-lib`:
- `embedPage` / `embedPages`: Embeds template pages into the target document as Form XObjects.
- For **Underlay**: Prepends an XObject drawing stream `q ... /Xo Do Q` to the target page's `Contents` array before existing contents.
- For **Overlay**: Appends `page.drawPage(embeddedTemplate, { x, y, width, height, opacity })` to draw on top.
- 100% Client-side, fast execution, preserves vector text and fonts.
