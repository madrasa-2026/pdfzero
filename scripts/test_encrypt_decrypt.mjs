import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PDFDocument } = require('pdf-lib-with-encrypt');
import fs from 'fs';
import path from 'path';

async function testEncryptDecrypt() {
  const samplePdfPath = path.resolve('C:/Users/mehed/.gemini/antigravity/brain/5277aa9a-5ac1-4cf6-859c-befbd38b14a2/scratch/RotateTestDoc.pdf');
  const pdfBytes = fs.readFileSync(samplePdfPath);

  console.log('1. Loading original PDF...');
  const pdfDoc = await PDFDocument.load(pdfBytes);
  console.log('Original PDF pages:', pdfDoc.getPageCount());

  console.log('2. Encrypting PDF with password "secret123"...');
  pdfDoc.encrypt({
    userPassword: 'secret123',
    ownerPassword: 'ownersecret123',
  });
  const encryptedBytes = await pdfDoc.save();
  console.log('Encrypted bytes length:', encryptedBytes.length);

  console.log('3. Trying to load encrypted PDF without password (expecting error)...');
  try {
    await PDFDocument.load(encryptedBytes);
    console.error('ERROR: Loaded without password!');
  } catch (err) {
    console.log('SUCCESS: Failed to load without password:', err.message);
  }

  console.log('4. Loading encrypted PDF with password...');
  const decryptedDoc = await PDFDocument.load(encryptedBytes, { password: 'secret123' });
  console.log('Decrypted doc pages:', decryptedDoc.getPageCount());

  console.log('5. Saving unlocked PDF without password...');
  // Note: in pdf-lib-with-encrypt, to remove password, we don't call encrypt() on a loaded document
  // Or we create a new doc and copy pages!
  const unlockedDoc = await PDFDocument.create();
  const pages = await unlockedDoc.copyPages(decryptedDoc, decryptedDoc.getPageIndices());
  pages.forEach(p => unlockedDoc.addPage(p));
  const unlockedBytes = await unlockedDoc.save();
  console.log('Unlocked bytes length:', unlockedBytes.length);

  // Verify unlocked PDF can be loaded by standard reader
  const verifiedDoc = await PDFDocument.load(unlockedBytes);
  console.log('Verified unlocked doc pages:', verifiedDoc.getPageCount());

  console.log('TEST SUCCEEDED COMPLETELY!');
}

testEncryptDecrypt().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
