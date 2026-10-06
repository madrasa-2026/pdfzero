import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';

async function verifyZip() {
  const filePath = path.resolve('C:/Users/mehed/.gemini/antigravity/brain/5277aa9a-5ac1-4cf6-859c-befbd38b14a2/downloaded_images.zip');
  if (!fs.existsSync(filePath)) {
    console.error('File does not exist:', filePath);
    process.exit(1);
  }

  const bytes = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(bytes);
  const files = Object.keys(zip.files).filter(f => !zip.files[f].dir);

  console.log('Files inside ZIP:', files);
  if (files.length !== 3) {
    console.error(`Expected 3 image files, found ${files.length}`);
    process.exit(1);
  }

  for (const name of ['page-1.jpg', 'page-2.jpg', 'page-3.jpg']) {
    if (!files.includes(name)) {
      console.error(`Missing expected file in ZIP: ${name}`);
      process.exit(1);
    }
    const fileData = await zip.files[name].async('nodebuffer');
    if (fileData.length < 500) {
      console.error(`File ${name} is too small: ${fileData.length} bytes`);
      process.exit(1);
    }
    console.log(`Verified ${name}: ${fileData.length} bytes`);
  }

  console.log('ALL PDF TO JPG ZIP CHECKS PASSED PERFECTLY!');
}

verifyZip().catch(err => {
  console.error(err);
  process.exit(1);
});
