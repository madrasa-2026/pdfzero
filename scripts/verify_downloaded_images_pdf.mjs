import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

async function verifyImagesPdf() {
  const filePath = path.resolve('C:/Users/mehed/.gemini/antigravity/brain/5277aa9a-5ac1-4cf6-859c-befbd38b14a2/downloaded_images.pdf');
  if (!fs.existsSync(filePath)) {
    console.error('File does not exist:', filePath);
    process.exit(1);
  }

  const bytes = fs.readFileSync(filePath);
  const pdfDoc = await PDFDocument.load(bytes);
  const pages = pdfDoc.getPages();

  console.log(`Total Pages in generated PDF: ${pages.length}`);
  if (pages.length !== 2) {
    console.error(`Expected 2 pages, got ${pages.length}`);
    process.exit(1);
  }

  console.log(`Page 1 dimensions: ${pages[0].getWidth()} x ${pages[0].getHeight()}`);
  console.log(`Page 2 dimensions: ${pages[1].getWidth()} x ${pages[1].getHeight()}`);

  console.log(`File size: ${bytes.length} bytes`);
  if (bytes.length < 1000) {
    console.error('File size unexpectedly small');
    process.exit(1);
  }

  console.log('ALL JPG TO PDF CHECKS PASSED PERFECTLY!');
}

verifyImagesPdf().catch(err => {
  console.error(err);
  process.exit(1);
});
