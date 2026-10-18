# Design Spec: In-Browser Text-to-Speech (TTS) PDF Audio Reader (`/tools/reader-pdf`)

## 1. Problem Statement & Motivation
Audio reading software like Speechify, NaturalReader, and Voice Dream charge \$12–\$30/month or \$139/year to listen to PDFs aloud. Free web tools often limit listening to 5 minutes, force users to wait in cloud rendering queues, or upload private documents to remote AI servers.

Students, researchers, commuters, individuals with dyslexia or visual impairments, and multitaskers need a private, zero-latency way to listen to their documents while following along with live sentence highlighting.

AirPDF delivers a **100% Free, Client-Side Text-to-Speech (TTS) PDF Audio Reader**. It parses PDF text structures in memory, streams audio using high-fidelity native browser voices via the Web Speech API, synchronizes live sentence highlighting, and never uploads documents to any server.

## 2. Technical Architecture (`src/lib/pdf/reader.ts`)

### Text Structuring & Sentence Segmentation
1. **Text Extraction & Cleaning**:
   - Extracts page text items using `pdfjs-dist`.
   - Cleans up line break artifacts (de-hyphenates words split across lines like `im- / portant` → `important`, collapses paragraph breaks).
2. **Sentence Boundary Tokenization**:
   - Segments raw text into discrete sentence chunks using regex sentence-ending lookahead `(?<=[.!?])\s+`.
   - Associates each sentence with its page number and paragraph sequence index.
3. **Web Speech Synthesis Coordination**:
   - Manages playback state (`idle`, `playing`, `paused`, `stopped`).
   - Hooks into `SpeechSynthesisUtterance.onboundary` and `onend` to trigger real-time UI highlighting on the active sentence.
   - Supports adjustable speech rates ($0.75\times$ to $2.0\times$), pitch adjustments, and voice selection across all installed browser system voices.

## 3. UI/UX Interface (`src/components/tools/ReaderPdfIsland.astro`)
1. **Dropzone**: Select or drag & drop PDF document.
2. **Audio Reader Workspace**:
   - **Sticky Audio Control Bar**:
     - Play / Pause / Resume toggle button.
     - Skip Previous Sentence (⏮) & Skip Next Sentence (⏭).
     - Playback Speed Selector ($0.75\times$, $1.0\times$, $1.25\times$, $1.5\times$, $1.75\times$, $2.0\times$).
     - System Voice Dropdown (Google US English, Microsoft Natural, Siri, etc.).
     - Live reading progress indicator (`Page X of Y • Sentence Z of Total`).
   - **Interactive Reader Viewport**:
     - Formatted typography layout of the document.
     - Active sentence highlighted with soft amber/sky illumination as audio plays.
     - Click-to-read: Clicking any sentence immediately jumps playback to that exact spot.
