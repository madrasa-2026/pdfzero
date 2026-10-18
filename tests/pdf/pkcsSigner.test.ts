import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import forge from 'node-forge';
import {
  generateSelfSignedCertificate,
  parsePkcs12Certificate,
  signPdfCryptographically,
  verifySignedPdf,
} from '../../src/lib/pdf/pkcsSigner';

describe('Cryptographic PDF Digital Signature Engine (PKCS#7 / PAdES)', () => {
  it('generates an authentic self-signed X.509 certificate and RSA keypair', async () => {
    const creds = await generateSelfSignedCertificate({
      commonName: 'John Doe, Esq.',
      organization: 'Acme Legal LLC',
      email: 'john@acmelegal.com',
      country: 'US',
      validityDays: 365,
    });

    expect(creds.commonName).toBe('John Doe, Esq.');
    expect(creds.privateKeyPem).toContain('-----BEGIN RSA PRIVATE KEY-----');
    expect(creds.certificatePem).toContain('-----BEGIN CERTIFICATE-----');

    // Parse cert to verify properties
    const cert = forge.pki.certificateFromPem(creds.certificatePem);
    const cn = cert.subject.getField('CN');
    expect(cn?.value).toBe('John Doe, Esq.');
    const org = cert.subject.getField('O');
    expect(org?.value).toBe('Acme Legal LLC');
  });

  it('parses PKCS#12 (.p12 / .pfx) certificate bundle with password', async () => {
    // Generate synthetic PKCS#12 bundle
    const keys = forge.pki.rsa.generateKeyPair({ bits: 1024, workers: -1 });
    const cert = forge.pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = '01';
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
    cert.setSubject([{ name: 'commonName', value: 'Corporate Signer' }]);
    cert.setIssuer([{ name: 'commonName', value: 'Corporate Signer' }]);
    cert.sign(keys.privateKey, forge.md.sha256.create());

    const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], 'pass123');
    const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
    const p12Bytes = new Uint8Array(Buffer.from(p12Der, 'binary'));

    const parsed = parsePkcs12Certificate(p12Bytes, 'pass123');
    expect(parsed.commonName).toBe('Corporate Signer');
    expect(parsed.privateKeyPem).toContain('-----BEGIN RSA PRIVATE KEY-----');
    expect(parsed.certificatePem).toContain('-----BEGIN CERTIFICATE-----');
  });

  it('cryptographically signs a PDF document with detached PKCS#7 signature and valid ByteRange', async () => {
    // Create synthetic PDF document
    const testDoc = await PDFDocument.create();
    const page = testDoc.addPage([500, 700]);
    page.drawText('Official Settlement Contract', { x: 50, y: 650, size: 20 });
    page.drawText('All parties agree to the binding terms herein.', { x: 50, y: 600, size: 12 });
    const initialBytes = await testDoc.save();

    const creds = await generateSelfSignedCertificate({
      commonName: 'Alice Auditor',
      organization: 'Audit Corp',
    });

    const result = await signPdfCryptographically(initialBytes, creds, {
      signerName: 'Alice Auditor',
      reason: 'I approve and execute this contract',
      location: 'New York, NY',
      visualStamp: true,
      position: 'bottom-right',
    });

    expect(result.signerName).toBe('Alice Auditor');
    expect(result.sha256Fingerprint).toBeDefined();
    expect(result.outputSize).toBeGreaterThan(initialBytes.length);

    // Verify cryptographic signature structures in final PDF
    const verification = verifySignedPdf(result.pdfBytes);
    expect(verification.isSigned).toBe(true);
    expect(verification.signerName).toBe('Alice Auditor');
    expect(verification.reason).toBe('I approve and execute this contract');
    expect(verification.location).toBe('New York, NY');
    expect(verification.byteRangeValid).toBe(true);
  });

  it('throws error when common name is missing in self-signed certificate generation', async () => {
    await expect(generateSelfSignedCertificate({ commonName: '' })).rejects.toThrow(
      'Signer Common Name is required to generate a certificate.'
    );
  });
});
