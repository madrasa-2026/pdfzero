# Design Spec: PDF Linearization (Fast Web View Optimizer) (`/tools/linearize-pdf`)

## 1. Problem Statement & Motivation
When serving multi-page PDF documents (e.g., ebooks, financial reports, technical manuals, whitepapers, legal briefs) over the web or mobile networks, users often experience sluggish load times and blank screens. In standard PDFs, the cross-reference (xref) table is located at the very end of the file. Before a browser can render even the first page, it must download the entire multi-megabyte file.

**PDF Linearization** (also known as **Fast Web View**, ISO 32000-1 Annex F) reorders the internal structure of the PDF file:
1. The **Linearization Parameter Dictionary** (`/Linearized 1.0`) is placed within the first 1024 bytes.
2. All objects required to render **Page 1** (page dictionary, content streams, fonts, and inline images) are grouped contiguously at the front of the file.
3. Hint tables are created to enable HTTP byte-range streaming (`Range: bytes=...`).
4. Orphan objects and unused xref revisions are pruned and compacted.

Commercial tools (Adobe Acrobat DC Pro, Foxit, Sejda) charge \$15–\$25/month for PDF linearization. Online tools upload sensitive files to remote servers.

AirPDF provides a **100% Free, Client-Side Fast Web View & Linearization Optimizer** that restructures documents in browser memory for instant streaming and faster web viewing.

## 2. Technical Architecture & Engine (`src/lib/pdf/linearize.ts`)

### Key Components
1. **Object Graph Restructuring & Page 1 Isolation**:
   - Parses the PDF document and isolates the dependency subgraph required exclusively for Page 1.
   - Defragments the PDF object tree, pruning unreferenced indirect objects and old revision deltas.
2. **Linearization Header Generation**:
   - Generates the standard PDF linearization parameter dictionary:
     `<< /Linearized 1.0 /L <FileSize> /H [<HintOffset> <HintLength>] /O <FirstPageObjNum> /E <EndOfFirstPage> /N <PageCount> /T <XRefOffset> >>`
   - Injects the linearization dictionary in the first 1024 bytes of the output stream.
3. **Stream Defragmentation & Compaction**:
   - Re-indexes object references and outputs contiguous object numbers.
   - Generates clean, normalized cross-reference tables and trailer dictionaries.
4. **Validation & Metrics**:
   - Detects whether an uploaded PDF is already linearized.
   - Computes stream reduction, page 1 byte offset, and streaming readiness score.

## 3. UI/UX Interface (`src/components/tools/LinearizePdfIsland.astro`)
1. **File Dropzone**: Accepts multi-page PDF files.
2. **Status & Diagnostic Inspection**:
   - Displays whether the uploaded document is currently linearized (`Fast Web View: Enabled` vs `Disabled`).
   - Page count and original file size.
3. **Interactive Optimization Panel**:
   - Option: Optimize Object Streams & Prune Unused Xrefs.
   - Option: Reorder Page 1 Resources to File Header.
   - Visual streaming simulation bar showing page 1 download latency comparison.
4. **Execution & Results**:
   - Summary of Linearization status, file size savings, and instant download button (`document-fastwebview.pdf`).
