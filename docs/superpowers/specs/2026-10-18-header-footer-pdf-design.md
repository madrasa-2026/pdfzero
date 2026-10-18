# Specification: PDF Header, Footer & Running Head Inserter (`/tools/header-footer-pdf`)

## 1. Problem & Competitor Landscape
- **Competitor Lock-in:** Adobe Acrobat Pro, Sejda, and Smallpdf charge $15–$25/month for adding running headers and footers to multi-page PDFs.
- **The Core Problem:** Adding consistent headers and footers (document title, author, date, confidentiality notices, dynamic page counters) to multi-page documents is cumbersome. Desktop word processors can do this during authoring, but once exported to PDF or scanned, users are locked out unless they pay monthly subscriptions. Free web converters compromise security and leak confidential briefs.
- **AirPDF Solution:** 100% in-browser Header, Footer & Running Head Inserter that injects razor-sharp vector typography into 6 anchor locations with dynamic macro replacement, cover page exclusion, and odd/even alternating page rules in memory.

## 2. Technical Architecture & Algorithm

### 6-Way Slot Mapping
For each page of dimensions $W \times H$:
- Margin offsets: `marginHorizontal` (default 36 pt / 0.5 in), `marginVertical` (default 30 pt)
- Header slots ($Y = H - \text{marginVertical}$):
  - `headerLeft`: $X = \text{marginHorizontal}$, left-aligned
  - `headerCenter`: $X = (W - \text{textWidth}) / 2$, center-aligned
  - `headerRight`: $X = W - \text{marginHorizontal} - \text{textWidth}$, right-aligned
- Footer slots ($Y = \text{marginVertical}$):
  - `footerLeft`: $X = \text{marginHorizontal}$, left-aligned
  - `footerCenter`: $X = (W - \text{textWidth}) / 2$, center-aligned
  - `footerRight`: $X = W - \text{marginHorizontal} - \text{textWidth}$, right-aligned

### Dynamic Macro Substitution
Supported template tokens:
- `{{page}}`: Current page number (adjusted by starting index)
- `{{total}}`: Total page count of document
- `{{date}}`: Current date (ISO or custom)
- `{{filename}}`: Source file name without extension

### Alternating Running Heads & Exclusion Rules
- `skipFirstPage`: Boolean (essential for title/cover page).
- `pageScope`: `'all' | 'odd' | 'even' | 'range'`.
- `alternatingHeads`: Swaps Left and Right slots on odd vs even pages for book spreads.

## 3. UI/UX Flow (`HeaderFooterPdfIsland.astro`)
1. **Dropzone:** File selection with page count preview.
2. **Configuration Grid:**
   - 6 text input slots arranged in Header & Footer layout.
   - Quick variable inserters (`+ Page #`, `+ Total Pages`, `+ Today's Date`, `+ Document Title`).
   - Formatting options: Font size (8, 9, 10, 11, 12 pt), font family, color, margin insets.
   - Checkbox: "Skip First Page (Cover)" & "Alternating Odd/Even Pages".
3. **Live Sample Preview:**
   - Visual mock preview showing how headers and footers align on a sample page.
4. **Instant Vector Download:**
   - Download stamped PDF with `-headers.pdf` suffix with 100% vector typography intact.

## 4. Verification & Testing Strategy
- Unit tests in `tests/pdf/headerFooter.test.ts`:
  - Verify macro replacement (`{{page}} of {{total}}`, date).
  - Verify 6-way coordinate calculation and text alignment.
  - Verify cover page exclusion and alternating odd/even placement.
- Dual Audit:
  - Code/Security: Vitest, zero external requests.
  - Human UX: Dropzone, 6-slot grid, macro pills, live preview, download action, SEO/FAQ verification.
