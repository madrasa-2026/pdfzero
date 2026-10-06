import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PDFDocument } = require('pdf-lib-with-encrypt');
import fs from 'fs';
import path from 'path';

async function verifyProtectedPdf() {
  const filePath = path.resolve('C:/Users/mehed/.gemini/antigravity/brain/5277aa9a-5ac1-4cf6-859c-befbd38b14a2/downloaded_protected.pdf');
  if (!fs.existsSync(filePath)) {
    console.error('File does not exist:', filePath);
    process.exit(1);
  }

  const bytes = fs.readFileSync(filePath);

  console.log('1. Verifying that loading WITHOUT password fails...');
  let failedWithoutPassword = false;
  try {
    await PDFDocument.load(bytes);
    console.error('CRITICAL: Document loaded without password!');
  } catch (err) {
    failedWithoutPassword = true;
    console.log('PASS: Correctly rejected unauthenticated load:', err.message);
  }

  if (!failedWithoutPassword) {
    process.exit(1);
  }

  console.log('2. Verifying that loading WITH password "SecureSecret123!" succeeds...');
  const doc = await PDFDocument.load(bytes, { password: 'SecureSecret123!' });
  const count = doc.getPageCount();
  console.log(`Document opened successfully. Total pages: ${count}`);

  if (count !== 3) {
    console.error(`Expected 3 pages, got ${count}`);
    process.exit(1);
  }

  console.log('ALL PROTECT PDF VERIFICATION CHECKS PASSED PERFECTLY!');
}

verifyProtectedPdf().catch(err => {
  console.error(err);
  process.exit(1);
});
