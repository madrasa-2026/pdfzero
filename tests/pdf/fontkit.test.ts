import { test, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { loadBengaliFont, isBengaliText } from '../../src/lib/pdf/fontkit';

test('isBengaliText identifies Bengali characters', () => {
  expect(isBengaliText('Hello World')).toBe(false);
  expect(isBengaliText('বাংলা পরীক্ষা')).toBe(true);
});

test('embeds Bengali font and draws Bengali text without encoding errors', async () => {
  const doc = await PDFDocument.create();
  const page = doc.addPage([600, 400]);
  const font = await loadBengaliFont(doc);
  expect(() => {
    page.drawText('বাংলা নথি সম্পাদনা', { x: 50, y: 300, size: 20, font });
  }).not.toThrow();
  const bytes = await doc.save();
  expect(bytes.length).toBeGreaterThan(1000);
});
