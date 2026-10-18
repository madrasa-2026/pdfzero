import forge from 'node-forge';
import {
  PDFDocument,
  PDFName,
  PDFString,
  PDFHexString,
  rgb,
  StandardFonts,
} from 'pdf-lib';

export interface SelfSignedCertParams {
  commonName: string;
  organization?: string;
  email?: string;
  country?: string;
  validityDays?: number;
}

export interface CertificateCredentials {
  privateKeyPem: string;
  certificatePem: string;
  certificateChainPem?: string[];
  commonName: string;
}

export interface DigitalSignerOptions {
  signerName?: string;
  reason?: string;
  location?: string;
  contactInfo?: string;
  visualStamp?: boolean;
  pageNumber?: number; // 1-based, default: 1
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  customX?: number;
  customY?: number;
}

export interface SignResult {
  pdfBytes: Uint8Array;
  originalSize: number;
  outputSize: number;
  signerName: string;
  signingTime: Date;
  sha256Fingerprint: string;
}

export interface VerifyResult {
  isSigned: boolean;
  signerName?: string;
  reason?: string;
  location?: string;
  signingTime?: string;
  byteRangeValid: boolean;
}

const PLACEHOLDER_BYTES = 8192; // 8192 bytes = 16384 hex characters
const PLACEHOLDER_HEX = '0'.repeat(PLACEHOLDER_BYTES * 2);
const BYTERANGE_PLACEHOLDER = '/ByteRange [ 0 9999999999 9999999999 9999999999 ]';

/**
 * Generates an in-browser self-signed X.509 certificate and RSA keypair.
 */
export async function generateSelfSignedCertificate(
  params: SelfSignedCertParams
): Promise<CertificateCredentials> {
  const {
    commonName,
    organization = 'AirPDF Secure Client',
    email,
    country = 'US',
    validityDays = 365,
  } = params;

  if (!commonName || !commonName.trim()) {
    throw new Error('Signer Common Name is required to generate a certificate.');
  }

  // Generate 2048-bit RSA keypair
  const keys = forge.pki.rsa.generateKeyPair({ bits: 2048, workers: -1 });
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = forge.util.bytesToHex(forge.random.getBytesSync(16));

  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setDate(cert.validity.notBefore.getDate() + validityDays);

  const attrs: forge.pki.CertificateField[] = [
    { name: 'commonName', value: commonName.trim() },
    { name: 'organizationName', value: organization.trim() },
    { name: 'countryName', value: country.trim() },
  ];

  if (email && email.trim()) {
    attrs.push({ name: 'emailAddress', value: email.trim() });
  }

  cert.setSubject(attrs);
  cert.setIssuer(attrs);

  // Set standard X.509 v3 digital signature extensions
  cert.setExtensions([
    {
      name: 'basicConstraints',
      cA: false,
    },
    {
      name: 'keyUsage',
      digitalSignature: true,
      nonRepudiation: true,
      keyEncipherment: true,
      dataEncipherment: true,
    },
    {
      name: 'extKeyUsage',
      clientAuth: true,
      emailProtection: true,
    },
  ]);

  // Self-sign certificate using SHA-256
  cert.sign(keys.privateKey, forge.md.sha256.create());

  return {
    privateKeyPem: forge.pki.privateKeyToPem(keys.privateKey),
    certificatePem: forge.pki.certificateToPem(cert),
    commonName: commonName.trim(),
  };
}

/**
 * Parses existing .p12 / .pfx PKCS#12 bundle using provided password.
 */
export function parsePkcs12Certificate(
  p12Bytes: Uint8Array,
  password = ''
): CertificateCredentials {
  try {
    const p12Der = forge.util.createBuffer(p12Bytes);
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

    // Extract private key
    let privateKeyPem = '';
    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const standardKeyBags = p12.getBags({ bagType: forge.pki.oids.keyBag });

    const keyBagList = (keyBags[forge.pki.oids.pkcs8ShroudedKeyBag] || []).concat(
      standardKeyBags[forge.pki.oids.keyBag] || []
    );

    if (keyBagList.length > 0 && keyBagList[0].key) {
      privateKeyPem = forge.pki.privateKeyToPem(keyBagList[0].key);
    }

    if (!privateKeyPem) {
      throw new Error('No private key found in PKCS#12 certificate.');
    }

    // Extract certificate chain
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certList = certBags[forge.pki.oids.certBag] || [];

    if (certList.length === 0 || !certList[0].cert) {
      throw new Error('No X.509 certificate found in PKCS#12 certificate.');
    }

    const primaryCert = certList[0].cert;
    const certificatePem = forge.pki.certificateToPem(primaryCert);
    const certificateChainPem = certList.map((b) => forge.pki.certificateToPem(b.cert!));

    const cnField = primaryCert.subject.getField('CN');
    const commonName = cnField && cnField.value ? String(cnField.value) : 'Digital Signer';

    return {
      privateKeyPem,
      certificatePem,
      certificateChainPem,
      commonName,
    };
  } catch (err: any) {
    throw new Error(`Failed to read .p12/.pfx certificate: ${err.message}`);
  }
}

/**
 * Signs a PDF cryptographically using PKCS#7 / PAdES detached signature standard.
 */
export async function signPdfCryptographically(
  pdfBytes: Uint8Array,
  credentials: CertificateCredentials,
  options: DigitalSignerOptions = {}
): Promise<SignResult> {
  const originalSize = pdfBytes.length;
  const signerName = options.signerName?.trim() || credentials.commonName || 'Digital Signer';
  const reason = options.reason?.trim() || 'Document integrity and authenticity certification';
  const location = options.location?.trim() || 'Client Device (In-Browser)';
  const contactInfo = options.contactInfo?.trim() || '';
  const signingTime = new Date();

  // Load PDF with pdf-lib to prepare dictionary and optional visual appearance
  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const pageCount = doc.getPageCount();

  if (pageCount === 0) {
    throw new Error('PDF document contains no pages to sign.');
  }

  // Optional visual stamp
  if (options.visualStamp) {
    const targetPageIndex = Math.max(
      0,
      Math.min(pageCount - 1, (options.pageNumber || 1) - 1)
    );
    const page = doc.getPage(targetPageIndex);
    const { width: pWidth, height: pHeight } = page.getSize();

    const stampWidth = 200;
    const stampHeight = 65;
    let stampX = 36;
    let stampY = 36;

    const pos = options.position || 'bottom-right';
    if (pos === 'bottom-right') {
      stampX = pWidth - stampWidth - 36;
      stampY = 36;
    } else if (pos === 'bottom-left') {
      stampX = 36;
      stampY = 36;
    } else if (pos === 'top-right') {
      stampX = pWidth - stampWidth - 36;
      stampY = pHeight - stampHeight - 36;
    } else if (pos === 'top-left') {
      stampX = 36;
      stampY = pHeight - stampHeight - 36;
    }

    if (options.customX !== undefined && options.customY !== undefined) {
      stampX = Math.max(0, Math.min(pWidth - stampWidth, options.customX));
      stampY = Math.max(0, Math.min(pHeight - stampHeight, options.customY));
    }

    const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const helvetica = await doc.embedFont(StandardFonts.Helvetica);

    // Card background
    page.drawRectangle({
      x: stampX,
      y: stampY,
      width: stampWidth,
      height: stampHeight,
      color: rgb(0.97, 0.98, 1.0),
      borderColor: rgb(0.2, 0.4, 0.9),
      borderWidth: 1,
      opacity: 0.95,
    });

    // Left decorative bar
    page.drawRectangle({
      x: stampX,
      y: stampY,
      width: 4,
      height: stampHeight,
      color: rgb(0.15, 0.35, 0.85),
    });

    // Stamp text lines
    page.drawText('DIGITALLY CERTIFIED', {
      x: stampX + 12,
      y: stampY + stampHeight - 14,
      size: 8,
      font: helveticaBold,
      color: rgb(0.12, 0.3, 0.75),
    });

    page.drawText(`Signer: ${signerName.slice(0, 26)}`, {
      x: stampX + 12,
      y: stampY + stampHeight - 26,
      size: 8,
      font: helveticaBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    page.drawText(`Date: ${signingTime.toISOString().replace('T', ' ').slice(0, 19)} UTC`, {
      x: stampX + 12,
      y: stampY + stampHeight - 38,
      size: 7,
      font: helvetica,
      color: rgb(0.3, 0.35, 0.4),
    });

    page.drawText(`Reason: ${reason.slice(0, 32)}`, {
      x: stampX + 12,
      y: stampY + stampHeight - 50,
      size: 7,
      font: helvetica,
      color: rgb(0.4, 0.45, 0.5),
    });

    page.drawText('Verified by AirPDF Client PKCS#7 Engine', {
      x: stampX + 12,
      y: stampY + 6,
      size: 6,
      font: helvetica,
      color: rgb(0.5, 0.55, 0.6),
    });
  }

  // Create signature dictionary object
  const sigDict = doc.context.obj({
    Type: 'Sig',
    Filter: 'Adobe.PPKLite',
    SubFilter: 'adbe.pkcs7.detached',
    ByteRange: [0, 9999999999, 9999999999, 9999999999], // fixed length placeholder
    Contents: PDFHexString.of(PLACEHOLDER_HEX),
    Reason: PDFString.of(reason),
    M: PDFString.fromDate(signingTime),
    Name: PDFString.of(signerName),
    Location: PDFString.of(location),
    ContactInfo: contactInfo ? PDFString.of(contactInfo) : undefined,
  });

  const sigRef = doc.context.register(sigDict);

  // Link signature to Document Catalog AcroForm
  const page1 = doc.getPage(0);
  const widgetDict = doc.context.obj({
    Type: 'Annot',
    Subtype: 'Widget',
    FT: 'Sig',
    Rect: [0, 0, 0, 0],
    V: sigRef,
    T: PDFString.of(`Signature_${Date.now()}`),
    F: 4,
    P: page1.ref,
  });

  const widgetRef = doc.context.register(widgetDict);

  // Add annotation to first page Annots array
  const existingAnnots = page1.node.Annots();
  if (existingAnnots) {
    existingAnnots.push(widgetRef);
  } else {
    page1.node.set(PDFName.of('Annots'), doc.context.obj([widgetRef]));
  }

  // Set or update AcroForm with SigFlags = 3
  const existingAcroFormRef = doc.catalog.get(PDFName.of('AcroForm'));
  if (existingAcroFormRef) {
    const acroForm = doc.context.lookup(existingAcroFormRef) as any;
    acroForm.set(PDFName.of('SigFlags'), doc.context.obj(3));
    const fieldsRef = acroForm.get(PDFName.of('Fields'));
    if (fieldsRef) {
      const fields = doc.context.lookup(fieldsRef) as any;
      fields.push(widgetRef);
    } else {
      acroForm.set(PDFName.of('Fields'), doc.context.obj([widgetRef]));
    }
  } else {
    const acroForm = doc.context.obj({
      Fields: [widgetRef],
      SigFlags: 3,
    });
    doc.catalog.set(PDFName.of('AcroForm'), acroForm);
  }

  // Save PDF without object streams to ensure linear byte offsets
  const preparedBytes = await doc.save({ useObjectStreams: false });

  // Locate ByteRange and Contents in the saved buffer
  const latinPdf = Buffer.from(preparedBytes).toString('latin1');
  const byteRangeIdx = latinPdf.indexOf(BYTERANGE_PLACEHOLDER);

  if (byteRangeIdx === -1) {
    throw new Error('Failed to locate ByteRange placeholder in serialized PDF.');
  }

  const contentsToken = '/Contents <';
  const contentsTokenIdx = latinPdf.indexOf(contentsToken);
  if (contentsTokenIdx === -1) {
    throw new Error('Failed to locate /Contents placeholder in serialized PDF.');
  }

  const placeholderHexStart = contentsTokenIdx + contentsToken.length;
  const placeholderHexEnd = placeholderHexStart + PLACEHOLDER_BYTES * 2;

  // The actual signed document spans:
  // Range 1: from start of file (0) up to '<' character at (contentsTokenIdx + '/Contents '.length)
  // Range 2: from character '>' immediately after placeholderHexEnd to EOF
  const range1Start = 0;
  const range1Length = contentsTokenIdx + '/Contents '.length; // byte index of '<'

  const range2Start = placeholderHexEnd + 1; // byte index right after '>'
  const range2Length = preparedBytes.length - range2Start;

  // Format exact ByteRange array with identical length to avoid shifting offsets
  const actualByteRangeStr = `/ByteRange [ ${range1Start.toString().padStart(1, ' ')} ${range1Length
    .toString()
    .padStart(10, '0')} ${range2Start.toString().padStart(10, '0')} ${range2Length
    .toString()
    .padStart(10, '0')} ]`;

  if (actualByteRangeStr.length !== BYTERANGE_PLACEHOLDER.length) {
    throw new Error(
      `ByteRange length mismatch: expected ${BYTERANGE_PLACEHOLDER.length}, got ${actualByteRangeStr.length}`
    );
  }

  // Write actual ByteRange in-place
  const signedBuffer = Buffer.from(preparedBytes);
  signedBuffer.write(actualByteRangeStr, byteRangeIdx, 'ascii');

  // Extract Range 1 and Range 2
  const part1 = signedBuffer.subarray(range1Start, range1Start + range1Length);
  const part2 = signedBuffer.subarray(range2Start, range2Start + range2Length);
  const contentToSign = Buffer.concat([part1, part2]);

  // Compute SHA-256 fingerprint for return payload
  const md = forge.md.sha256.create();
  md.update(contentToSign.toString('binary'));
  const sha256Fingerprint = md.digest().toHex();

  // Create PKCS#7 detached signature with node-forge
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(contentToSign);

  const certObj = forge.pki.certificateFromPem(credentials.certificatePem);
  const keyObj = forge.pki.privateKeyFromPem(credentials.privateKeyPem);

  p7.addCertificate(certObj);

  if (credentials.certificateChainPem && credentials.certificateChainPem.length > 0) {
    for (const chainPem of credentials.certificateChainPem) {
      try {
        const c = forge.pki.certificateFromPem(chainPem);
        p7.addCertificate(c);
      } catch {
        // ignore duplicate or unparsable chain certs
      }
    }
  }

  p7.addSigner({
    key: keyObj,
    certificate: certObj,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      {
        type: forge.pki.oids.contentType,
        value: forge.pki.oids.data,
      },
      {
        type: forge.pki.oids.messageDigest,
      },
      {
        type: forge.pki.oids.signingTime,
        value: signingTime,
      },
    ],
  });

  p7.sign({ detached: true });

  // Convert PKCS#7 DER to hex
  const derBytes = forge.asn1.toDer(p7.toAsn1()).getBytes();
  const hexSig = forge.util.bytesToHex(derBytes).toUpperCase();

  if (hexSig.length > PLACEHOLDER_BYTES * 2) {
    throw new Error(
      `Signature size (${hexSig.length} chars) exceeded allocated placeholder capacity (${
        PLACEHOLDER_BYTES * 2
      } chars).`
    );
  }

  // Right pad with zeros to exact placeholder length
  const paddedHex = hexSig.padEnd(PLACEHOLDER_BYTES * 2, '0');

  // Overwrite placeholder hex in-place
  signedBuffer.write(paddedHex, placeholderHexStart, 'ascii');

  const finalBytes = new Uint8Array(signedBuffer);

  return {
    pdfBytes: finalBytes,
    originalSize,
    outputSize: finalBytes.length,
    signerName,
    signingTime,
    sha256Fingerprint,
  };
}

/**
 * Validates whether a PDF has an embedded cryptographic signature dictionary.
 */
export function verifySignedPdf(pdfBytes: Uint8Array): VerifyResult {
  const str = Buffer.from(pdfBytes).toString('latin1');
  const hasSigType = str.includes('/Type /Sig') || str.includes('/Type/Sig');
  const hasFilter = str.includes('/Filter /Adobe.PPKLite') || str.includes('/Filter/Adobe.PPKLite');
  const hasSubFilter =
    str.includes('/SubFilter /adbe.pkcs7.detached') ||
    str.includes('/SubFilter/adbe.pkcs7.detached');

  if (!hasSigType || !hasFilter || !hasSubFilter) {
    return {
      isSigned: false,
      byteRangeValid: false,
    };
  }

  // Extract Name, Reason, Location, SigningTime
  const nameMatch = str.match(/\/Name\s*\(([^)]+)\)/);
  const reasonMatch = str.match(/\/Reason\s*\(([^)]+)\)/);
  const locMatch = str.match(/\/Location\s*\(([^)]+)\)/);
  const timeMatch = str.match(/\/M\s*\(D:([^)]+)\)/);

  // Extract ByteRange
  const rangeMatch = str.match(/\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/);
  let byteRangeValid = false;

  if (rangeMatch) {
    const o1 = parseInt(rangeMatch[1], 10);
    const l1 = parseInt(rangeMatch[2], 10);
    const o2 = parseInt(rangeMatch[3], 10);
    const l2 = parseInt(rangeMatch[4], 10);

    // ByteRange is mathematically valid if o1 is 0, o2 > l1, and o2 + l2 === pdfBytes.length
    if (o1 === 0 && o2 > l1 && o2 + l2 === pdfBytes.length) {
      byteRangeValid = true;
    }
  }

  return {
    isSigned: true,
    signerName: nameMatch ? nameMatch[1] : undefined,
    reason: reasonMatch ? reasonMatch[1] : undefined,
    location: locMatch ? locMatch[1] : undefined,
    signingTime: timeMatch ? timeMatch[1] : undefined,
    byteRangeValid,
  };
}
