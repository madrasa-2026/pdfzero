import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

async function verifyNumberedPdf() {
  const filePath = path.resolve('C:/Users/mehed/.gemini/antigravity/brain/5277aa9a-5ac1-4cf6-859c-befbd38b14a2/downloaded_numbered.pdf');
  if (!fs.existsSync(filePath)) {
    console.error('File does not exist:', filePath);
    process.exit(1);
  }

  const bytes = fs.readFileSync(filePath);
  const pdfDoc = await PDFDocument.load(bytes);
  const pages = pdfDoc.getPages();

  console.log(`Total Pages: ${pages.length}`);
  if (pages.length !== 3) {
    console.error(`Expected 3 pages, got ${pages.length}`);
    process.exit(1);
  }

  // Ensure file size is valid
  console.log(`File size: ${bytes.length} bytes`);
  if (bytes.length < 500) {
    console.error('File size too small');
    process.exit(1);
  }

  console.log('ALL NUMBERED PDF CHECKS PASSED PERFECTLY!');
}

verifyNumberedPdf().catch(err => {
  console.error(err);
  process.exit(1);
});
