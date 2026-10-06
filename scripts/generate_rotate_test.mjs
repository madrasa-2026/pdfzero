import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

async function makeTestPdf() {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  for (let i = 1; i <= 3; i++) {
    const page = pdfDoc.addPage([500, 700]);
    page.drawText(`Rotate Test Document - Page ${i}`, {
      x: 50,
      y: 600,
      size: 24,
      font,
      color: rgb(0.1, 0.2, 0.8),
    });
    page.drawText(`Initial orientation: Normal (0 degrees)`, {
      x: 50,
      y: 550,
      size: 14,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
  }

  const pdfBytes = await pdfDoc.save();
  const outDir = path.resolve('C:/Users/mehed/.gemini/antigravity/brain/5277aa9a-5ac1-4cf6-859c-befbd38b14a2/scratch');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const outPath = path.join(outDir, 'RotateTestDoc.pdf');
  fs.writeFileSync(outPath, pdfBytes);
  console.log('Saved test PDF to:', outPath);
}

makeTestPdf().catch(err => {
  console.error(err);
  process.exit(1);
});
