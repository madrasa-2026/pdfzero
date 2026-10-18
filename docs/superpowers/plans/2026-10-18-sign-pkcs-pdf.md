# Implementation Plan: True PDF Digital Signature & PKCS#7 Certificate Stamper (`/tools/sign-pkcs-pdf`)

## Phase 1: Cryptographic Engine Implementation (`src/lib/pdf/pkcsSigner.ts`)
- Define `DigitalSignerOptions`, `CertificateCredentials`, `SelfSignedCertParams`, and `SignResult`.
- Implement `generateSelfSignedCertificate(params: SelfSignedCertParams): Promise<CertificateCredentials>`.
- Implement `parsePkcs12Certificate(p12Bytes: Uint8Array, password?: string): CertificateCredentials`.
- Implement visual stamp drawer on target page using `pdf-lib`.
- Implement `signPdfCryptographically(pdfBytes: Uint8Array, credentials: CertificateCredentials, options?: DigitalSignerOptions): Promise<SignResult>`.
- Implement signature verification helper `verifySignedPdf(pdfBytes: Uint8Array): { isValidStructure: boolean; signerName?: string; signingTime?: Date; reason?: string }`.

## Phase 2: Unit Testing (`tests/pdf/pkcsSigner.test.ts`)
- Test 1: Self-signed certificate generation produces valid X.509 certificate and RSA 2048-bit key.
- Test 2: Parsing PKCS#12 bundle (.p12/.pfx) with password extracts credentials.
- Test 3: Signs a PDF document end-to-end, embedding `/Type /Sig`, `/ByteRange`, and `/Contents`.
- Test 4: Verifies the `/ByteRange` offsets mathematically match the file boundaries.
- Test 5: Optional visual stamp renders on the target page.

## Phase 3: Content Collection & UI Island
- Create `src/content/tools/sign-pkcs-pdf.md` (`category: 'security'`, `icon: 'shield'`).
- Build `src/components/tools/SignPkcsPdfIsland.astro` (Dropzone, dual tabs: 'Generate In-Browser Certificate' vs 'Upload .p12/.pfx', signer metadata inputs, visual appearance toggle and placement, instant download).
- Wire router switch in `src/pages/tools/[slug].astro`.
- Update `Footer.astro` (Security column), `Header.astro` counter (now 35 tools), and `index.astro`.

## Phase 4: Build, Deploy & Dual Audit
- Run `npm run test` (confirm 28 test suites pass).
- Run `npm run build` (confirm 40 static routes generated cleanly).
- Commit & push to master.
- Deploy to Cloudflare Pages (`airpdf` and `pdfzero`) on branch `main`.
- Execute Dual Audit (AI code/security + Human UI verification) on `https://airpdf.pages.dev/tools/sign-pkcs-pdf`.
