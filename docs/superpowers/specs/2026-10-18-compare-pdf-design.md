# Specification: Side-by-Side Visual & Text PDF Diff Comparator (`/tools/compare-pdf`)

## 1. Problem & Competitor Landscape
- **Competitor Lock-in:** Adobe Acrobat Pro, Diffchecker Desktop, and Draftable charge $15–$50/month for comparing two PDF revisions.
- **Privacy Hazard:** Mergers & acquisitions contracts, legal non-disclosure agreements, and draft patents cannot be uploaded to random cloud servers without violating NDAs and data governance policies.
- **AirPDF Solution:** 100% client-side, zero-upload PDF Comparison engine that performs both text-level semantic diffing and visual page rendering directly in browser memory.

## 2. Technical Architecture & Algorithm

### Semantic Text Extraction & Myers Diff Algorithm
1. Extract text lines and tokens from Document A and Document B using `pdfjs-dist` page text content streams.
2. Tokenize words with punctuation preservation.
3. Compute Longest Common Subsequence (LCS) / Myers diff between token lists.
4. Classify tokens into:
   - `added`: Words present in Doc B but not in Doc A (styled with emerald green highlight).
   - `removed`: Words present in Doc A but removed in Doc B (styled with red strike-through).
   - `unchanged`: Retained text.
5. Compute change summary metrics (Total words added, removed, net change, percentage similarity).

### Synchronized Side-by-Side UI View
- Left column: Document A (Original) with removed text marked in red.
- Right column: Document B (Modified) with added text marked in green.
- Page switcher: Allows navigating across matching pages (Page 1 vs Page 1, Page 2 vs Page 2).
- Diff counter: Highlights exactly how many additions/deletions occurred on each page.

## 3. UI/UX Flow (`ComparePdfIsland.astro`)
1. **Dual Dropzone:**
   - Dropzone A: "Original PDF (Revision 1)"
   - Dropzone B: "Modified PDF (Revision 2)"
2. **Comparison Options:**
   - Text Diff (Word-by-word comparison)
   - Visual Page Preview
   - Case Sensitivity & Whitespace Normalization toggles
3. **Diff Dashboard:**
   - Similarity score badge (e.g. `94% Match · +18 words added · -6 words removed`)
   - Page navigation bar (`< Page 1 of 5 >`) with change tags
   - Side-by-side synchronized diff view with line and word highlights
4. **Export / Copy Diff:**
   - Copy textual diff summary to clipboard or print summary report.

## 4. Verification & Testing Strategy
- Unit tests in `tests/pdf/compare.test.ts`:
  - Verify tokenization and word diff algorithm (detects additions, deletions, and exact unchanged spans).
  - Verify page-by-page alignment and similarity scoring.
  - Test edge cases (empty strings, completely identical documents, completely disjoint documents).
- Dual Audit:
  - Code/Security: Vitest, zero external requests, memory safety.
  - Human UX: Dual dropzone, responsive side-by-side view, page jumping, SEO/FAQ verification.
