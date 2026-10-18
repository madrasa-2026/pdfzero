import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  inspectPdfForm,
  flattenPdf,
} from '../../src/lib/pdf/flatten';

describe('PDF Form Flattener Engine', () => {
  it('detects interactive AcroForm fields in a document', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([400, 400]);
    const form = doc.getForm();

    const textField = form.createTextField('applicant_name');
    textField.setText('John Q. Public');
    textField.addToPage(page, { x: 50, y: 300, width: 200, height: 20 });

    const checkBox = form.createCheckBox('terms_accepted');
    checkBox.check();
    checkBox.addToPage(page, { x: 50, y: 250, width: 20, height: 20 });

    const pdfBytes = await doc.save({ useObjectStreams: false });

    const inspection = await inspectPdfForm(pdfBytes);
    expect(inspection.hasForm).toBe(true);
    expect(inspection.totalFields).toBe(2);
    expect(inspection.textFieldsCount).toBe(1);
    expect(inspection.checkboxesCount).toBe(1);
    expect(inspection.pageCount).toBe(1);
  });

  it('permanently flattens interactive fields into static vector page stream', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([400, 400]);
    const form = doc.getForm();

    const textField = form.createTextField('tax_id');
    textField.setText('TX-99482');
    textField.addToPage(page, { x: 50, y: 300, width: 150, height: 20 });

    const pdfBytes = await doc.save({ useObjectStreams: false });

    // Flatten
    const result = await flattenPdf(pdfBytes);
    expect(result.fieldsFlattened).toBe(1);
    expect(result.flattenedPdfBytes.length).toBeGreaterThan(0);

    // Reload and verify 0 interactive fields exist
    const reloaded = await PDFDocument.load(result.flattenedPdfBytes);
    const reloadedForm = reloaded.getForm();
    expect(reloadedForm.getFields().length).toBe(0);
  });
});
