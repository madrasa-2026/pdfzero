import { describe, it, expect } from 'vitest';
import {
  extractFormData,
  formFieldsToCsv,
  formFieldsToJson,
  populateForm
} from '../../src/lib/pdf/formDataEngine';
import { PDFDocument } from 'pdf-lib';

describe('PDF Form Data Engine', () => {
  async function createTestFormPdf(): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    const page = doc.addPage([600, 400]);
    const form = doc.getForm();

    const nameField = form.createTextField('fullName');
    nameField.setText('Alice Johnson');
    nameField.addToPage(page, { x: 50, y: 300, width: 200, height: 25 });

    const agreeBox = form.createCheckBox('agreeTerms');
    agreeBox.check();
    agreeBox.addToPage(page, { x: 50, y: 250, width: 20, height: 20 });

    const roleDropdown = form.createDropdown('role');
    roleDropdown.setOptions(['Admin', 'Editor', 'Viewer']);
    roleDropdown.select('Editor');
    roleDropdown.addToPage(page, { x: 50, y: 200, width: 150, height: 25 });

    return await doc.save();
  }

  it('extracts form fields, types, and values accurately', async () => {
    const pdfBytes = await createTestFormPdf();
    const fields = await extractFormData(pdfBytes);

    expect(fields.length).toBe(3);

    const nameRecord = fields.find((f) => f.name === 'fullName');
    expect(nameRecord).toBeDefined();
    expect(nameRecord?.type).toBe('text');
    expect(nameRecord?.value).toBe('Alice Johnson');

    const checkRecord = fields.find((f) => f.name === 'agreeTerms');
    expect(checkRecord).toBeDefined();
    expect(checkRecord?.type).toBe('checkbox');
    expect(checkRecord?.value).toBe(true);

    const roleRecord = fields.find((f) => f.name === 'role');
    expect(roleRecord).toBeDefined();
    expect(roleRecord?.type).toBe('dropdown');
    expect(roleRecord?.value).toEqual(['Editor']);
  });

  it('formats extracted records to RFC CSV and JSON', async () => {
    const pdfBytes = await createTestFormPdf();
    const fields = await extractFormData(pdfBytes);

    const csv = formFieldsToCsv(fields);
    expect(csv).toContain('Field Name,Field Type,Current Value,Options');
    expect(csv).toContain('fullName,text,Alice Johnson');
    expect(csv).toContain('agreeTerms,checkbox,true');

    const jsonStr = formFieldsToJson(fields);
    const parsed = JSON.parse(jsonStr);
    expect(parsed.fullName).toBe('Alice Johnson');
    expect(parsed.agreeTerms).toBe(true);
  });

  it('populates form fields with new values and flattens optionally', async () => {
    const pdfBytes = await createTestFormPdf();

    const populatedBytes = await populateForm(pdfBytes, {
      fullName: 'Robert Smith',
      agreeTerms: false,
      role: 'Admin'
    });

    const updatedFields = await extractFormData(populatedBytes);
    const nameRecord = updatedFields.find((f) => f.name === 'fullName');
    expect(nameRecord?.value).toBe('Robert Smith');

    const checkRecord = updatedFields.find((f) => f.name === 'agreeTerms');
    expect(checkRecord?.value).toBe(false);

    // Test with flattening
    const flattenedBytes = await populateForm(
      pdfBytes,
      { fullName: 'Final Signer' },
      { flatten: true }
    );
    const postFlattenFields = await extractFormData(flattenedBytes);
    expect(postFlattenFields.length).toBe(0); // Fields flattened into page content
  });
});
