import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

async function verifyRotations() {
  const filePath = path.resolve('C:/Users/mehed/.gemini/antigravity/brain/5277aa9a-5ac1-4cf6-859c-befbd38b14a2/downloaded_rotated.pdf');
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

  const r0 = pages[0].getRotation().angle;
  const r1 = pages[1].getRotation().angle;
  const r2 = pages[2].getRotation().angle;

  console.log(`Page 1 rotation: ${r0}°`);
  console.log(`Page 2 rotation: ${r1}°`);
  console.log(`Page 3 rotation: ${r2}°`);

  if (r0 !== 90) {
    console.error(`Page 1 expected 90°, got ${r0}°`);
    process.exit(1);
  }
  if (r1 !== 180) {
    console.error(`Page 2 expected 180°, got ${r1}°`);
    process.exit(1);
  }
  if (r2 !== 0) {
    console.error(`Page 3 expected 0°, got ${r2}°`);
    process.exit(1);
  }

  console.log('ALL ROTATION CHECKS PASSED PERFECTLY!');
}

verifyRotations().catch(err => {
  console.error(err);
  process.exit(1);
});
