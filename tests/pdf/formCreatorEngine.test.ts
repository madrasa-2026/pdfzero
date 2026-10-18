import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  injectFormFields,
  detectFormFieldsFromText,
  getExistingFormFieldsSummary,
  type FormFieldDefinition
} from '../../src/lib/pdf/formCreatorEngine';

describe('formCreatorEngine', () => {
  async function createSamplePdf(): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    const p1 = doc.addPage([600, 800]);
    const p2 = doc.addPage([600, 800]);
    return await doc.save();
  }

  it('injects text fields, checkboxes, and dropdowns into PDF pages', async () => {
    const pdfBytes = await createSamplePdf();

    const fields: FormFieldDefinition[] = [
      {
        id: 'f1',
        name: 'applicant_name',
        type: 'text',
        pageIndex: 0,
        x: 100,
        y: 650,
        width: 200,
        height: 25,
        defaultValue: 'Jane Doe',
        isMultiline: false
      },
      {
        id: 'f2',
        name: 'notes',
        type: 'text',
        pageIndex: 0,
        x: 100,
        y: 500,
        width: 300,
        height: 100,
        defaultValue: 'Enter detailed notes here...',
        isMultiline: true
      },
      {
        id: 'f3',
        name: 'terms_agree',
        type: 'checkbox',
        pageIndex: 0,
        x: 100,
        y: 400,
        width: 20,
        height: 20,
        checked: true
      },
      {
        id: 'f4',
        name: 'country_choice',
        type: 'dropdown',
        pageIndex: 1,
        x: 150,
        y: 700,
        width: 180,
        height: 28,
        options: ['USA', 'Canada', 'United Kingdom', 'Australia'],
        defaultValue: 'Canada'
      }
    ];

    const outputBytes = await injectFormFields(pdfBytes, fields);
    expect(outputBytes).toBeInstanceOf(Uint8Array);
    expect(outputBytes.length).toBeGreaterThan(pdfBytes.length);

    // Verify injected fields using summary
    const summary = await getExistingFormFieldsSummary(outputBytes);
    expect(summary.length).toBe(4);

    const names = summary.map(s => s.name);
    expect(names).toContain('applicant_name');
    expect(names).toContain('notes');
    expect(names).toContain('terms_agree');
    expect(names).toContain('country_choice');
  });

  it('detects form fields from text items with underscores and label colons', () => {
    const textItems = [
      { str: 'Full Name:', x: 50, y: 700, width: 60, height: 12 },
      { str: '____________________', x: 120, y: 700, width: 200, height: 12 },
      { str: 'Check here: [ ]', x: 50, y: 650, width: 90, height: 12 },
      { str: 'Comments:', x: 50, y: 600, width: 60, height: 12 }
    ];

    const detected = detectFormFieldsFromText(textItems, 600, 800, 0);
    expect(detected.length).toBeGreaterThan(0);

    const hasUnderlineMatch = detected.some(d => d.type === 'text' && d.width >= 100);
    expect(hasUnderlineMatch).toBe(true);

    const hasCheckboxMatch = detected.some(d => d.type === 'checkbox');
    expect(hasCheckboxMatch).toBe(true);
  });
});
