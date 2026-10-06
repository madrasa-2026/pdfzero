import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';

async function verifyDocx() {
  const filePath = path.resolve('C:/Users/mehed/.gemini/antigravity/brain/5277aa9a-5ac1-4cf6-859c-befbd38b14a2/downloaded_doc.docx');
  if (!fs.existsSync(filePath)) {
    console.error('File does not exist:', filePath);
    process.exit(1);
  }

  const bytes = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(bytes);
  const files = Object.keys(zip.files).filter(f => !zip.files[f].dir);

  console.log('Files inside DOCX package:', files);
  if (!files.includes('word/document.xml')) {
    console.error('Missing word/document.xml in DOCX!');
    process.exit(1);
  }

  const docXml = await zip.files['word/document.xml'].async('string');
  console.log('Document XML preview (first 250 chars):', docXml.substring(0, 250));

  // Check that the text from RotateTestDoc.pdf was extracted
  const hasPage1 = docXml.includes('Page 1');
  const hasPage2 = docXml.includes('Page 2');
  const hasPage3 = docXml.includes('Page 3');

  console.log('Contains Page 1 text:', hasPage1);
  console.log('Contains Page 2 text:', hasPage2);
  console.log('Contains Page 3 text:', hasPage3);

  if (!hasPage1 || !hasPage2 || !hasPage3) {
    console.error('Extracted text missing expected page contents');
    process.exit(1);
  }

  console.log('ALL PDF TO WORD CHECKS PASSED PERFECTLY!');
}

verifyDocx().catch(err => {
  console.error(err);
  process.exit(1);
});
