import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';

function buildDocxXml(paragraphs) {
  const pXml = paragraphs.map(p => {
    const escaped = p
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
    return `<w:p><w:r><w:t xml:space="preserve">${escaped}</w:t></w:r></w:p>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${pXml}
    <w:sectPr/>
  </w:body>
</w:document>`;
}

async function createDocx(paragraphs) {
  const zip = new JSZip();

  // 1. [Content_Types].xml
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);

  // 2. _rels/.rels
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

  // 3. word/_rels/document.xml.rels
  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`);

  // 4. word/document.xml
  zip.file('word/document.xml', buildDocxXml(paragraphs));

  const buf = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });

  return buf;
}

async function run() {
  const buf = await createDocx(['Hello World', 'This is a test paragraph from PDFZero.']);
  const outPath = path.resolve('C:/Users/mehed/.gemini/antigravity/brain/5277aa9a-5ac1-4cf6-859c-befbd38b14a2/scratch/test_doc.docx');
  fs.writeFileSync(outPath, buf);
  console.log('Saved test docx to:', outPath, 'Bytes:', buf.length);
}

run();
