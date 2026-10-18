# Feature Specification: True PDF Digital Signature & PKCS#7 Certificate Stamper (`/tools/sign-pkcs-pdf`)

## 1. Problem Statement & User Value
Businesses, legal practitioners, contractors, and individuals frequently need to sign contracts, agreements, NDAs, and corporate filings with **cryptographically verifiable digital signatures**.

There is a critical legal and technical difference between:
1. **Electronic Signatures (E-Sign)**: A simple image or vector drawing pasted on top of a PDF page (which anyone can forge, copy-paste, or tamper with without detection).
2. **True Digital Signatures (PKCS#7 / PAdES)**: A cryptographic hash of the entire document signed by an X.509 private key and embedded into the PDF structure according to ISO 32000-1. If any byte of the document is altered after signing, Adobe Acrobat and all standard PDF readers flag the document as **tampered, corrupt, or invalid**.

Commercial platforms (DocuSign, Adobe Acrobat Pro, SignNow) charge $120–$480/year or $5/signature, while locking documents behind cloud servers where confidential contracts are stored remotely.

**AirPDF Solution**:
A 100% Free, Client-Side Cryptographic PDF Digital Signature Engine. Users can upload an existing `.p12`/`.pfx` digital certificate (e.g., from corporate PKI or identity authorities) or generate an in-browser self-signed X.509 certificate. The engine computes the document SHA-256 digest, generates a detached PKCS#7 signature, embeds an authentic `/Type /Sig` dictionary with `/ByteRange`, and applies an optional visual certificate stamp—all locally in browser RAM with zero server communication.

## 2. Cryptographic Architecture & Algorithm (`src/lib/pdf/pkcsSigner.ts`)
1. **Certificate Management**:
   - **Mode A: Existing Certificate (`.p12` / `.pfx`)**:
     Parse DER/PKCS#12 bundle using `node-forge` with user password. Extract private key and X.509 certificate chain.
   - **Mode B: Self-Signed In-Browser Certificate**:
     Generate RSA key pair (2048-bit) and construct X.509 v3 certificate signed with SHA-256. Subject attributes: Common Name (CN), Organization (O), Email (E), Country (C), Validity (1 year).
2. **Visual Signature Stamp (Optional)**:
   Draw a professional visual stamp on the target page:
   - Certificate seal icon + Signer Name
   - Reason & Location
   - Exact UTC Signing Timestamp
   - Document SHA-256 hash preview
3. **PDF Signature Dictionary Injection**:
   Using `pdf-lib`:
   - Register `/Type /Sig` dictionary with `/Filter /Adobe.PPKLite`, `/SubFilter /adbe.pkcs7.detached`, `/ByteRange`, `/Contents`, `/M`, `/Name`, `/Reason`, `/Location`.
   - Allocate fixed-size placeholders:
     `/ByteRange [ 0000000000 0000000000 0000000000 0000000000 ]`
     `/Contents <hex placeholder (8192 bytes = 16384 hex chars)>`
   - Link signature to AcroForm `/Fields` and page `/Annots` with `SigFlags: 3`.
   - Save PDF with `useObjectStreams: false`.
4. **ByteRange Calculation & In-Place Signing**:
   - Locate byte offsets of `/ByteRange` and `<` / `>` around `/Contents`.
   - Compute `[0, offset1, offset2, totalLength - offset2]`.
   - Overwrite `/ByteRange` placeholder with exact padded offsets.
   - Concatenate Range 1 `[0, offset1]` and Range 2 `[offset2, totalLength]`.
   - Compute SHA-256 digest over the concatenated ranges.
   - Encapsulate in PKCS#7 `SignedData` with detached content and sign with private key.
   - Convert DER signature to uppercase HEX, zero-pad to placeholder length, and overwrite into the `/Contents` slot.
5. **Output**:
   The output PDF is completely valid and verifiable in Adobe Acrobat, Foxit, Preview, and standard PDF cryptographic validators.

## 3. Security & Privacy
- 100% Client-side cryptographic operations in JavaScript/WebAssembly.
- Private keys and document bytes never leave user memory.
- Completely offline capable.
