import {
  PDFDocument,
  PDFTextField,
  PDFCheckBox,
  PDFRadioGroup,
  PDFDropdown,
  PDFOptionList,
  PDFButton
} from 'pdf-lib';

export type FormFieldType =
  | 'text'
  | 'checkbox'
  | 'radio'
  | 'dropdown'
  | 'option-list'
  | 'button'
  | 'unknown';

export interface FormFieldRecord {
  name: string;
  type: FormFieldType;
  value: string | boolean | string[];
  options?: string[];
  isReadOnly: boolean;
}

/**
 * Extracts all form field definitions, types, and current values from a PDF AcroForm.
 */
export async function extractFormData(pdfBytes: Uint8Array): Promise<FormFieldRecord[]> {
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

  let form;
  try {
    form = pdfDoc.getForm();
  } catch (err) {
    return [];
  }

  const fields = form.getFields();
  const records: FormFieldRecord[] = [];

  for (const field of fields) {
    const name = field.getName();
    const isReadOnly = field.isReadOnly();

    if (field instanceof PDFTextField) {
      records.push({
        name,
        type: 'text',
        value: field.getText() || '',
        isReadOnly
      });
    } else if (field instanceof PDFCheckBox) {
      records.push({
        name,
        type: 'checkbox',
        value: field.isChecked(),
        isReadOnly
      });
    } else if (field instanceof PDFRadioGroup) {
      records.push({
        name,
        type: 'radio',
        value: field.getSelected() || '',
        options: field.getOptions(),
        isReadOnly
      });
    } else if (field instanceof PDFDropdown) {
      records.push({
        name,
        type: 'dropdown',
        value: field.getSelected() || [],
        options: field.getOptions(),
        isReadOnly
      });
    } else if (field instanceof PDFOptionList) {
      records.push({
        name,
        type: 'option-list',
        value: field.getSelected() || [],
        options: field.getOptions(),
        isReadOnly
      });
    } else if (field instanceof PDFButton) {
      records.push({
        name,
        type: 'button',
        value: '',
        isReadOnly
      });
    } else {
      records.push({
        name,
        type: 'unknown',
        value: '',
        isReadOnly
      });
    }
  }

  return records;
}

/**
 * Serializes extracted form field records into RFC-4180 standard CSV format.
 */
export function formFieldsToCsv(records: FormFieldRecord[]): string {
  const header = ['Field Name', 'Field Type', 'Current Value', 'Options'];
  const rows = records.map((r) => {
    const valStr = Array.isArray(r.value)
      ? r.value.join('; ')
      : typeof r.value === 'boolean'
      ? r.value ? 'true' : 'false'
      : r.value;
    const optStr = r.options ? r.options.join('; ') : '';

    return [
      escapeCsvCell(r.name),
      escapeCsvCell(r.type),
      escapeCsvCell(valStr),
      escapeCsvCell(optStr)
    ].join(',');
  });

  return [header.join(','), ...rows].join('\r\n');
}

function escapeCsvCell(cell: string): string {
  if (cell.includes(',') || cell.includes('"') || cell.includes('\n') || cell.includes('\r')) {
    return `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}

/**
 * Serializes form field records into a key-value JSON dictionary.
 */
export function formFieldsToJson(records: FormFieldRecord[]): string {
  const obj: Record<string, any> = {};
  for (const r of records) {
    obj[r.name] = r.value;
  }
  return JSON.stringify(obj, null, 2);
}

/**
 * Populates a PDF AcroForm template with key-value data mappings.
 */
export async function populateForm(
  pdfBytes: Uint8Array,
  dataMap: Record<string, string | boolean | number>,
  options: { flatten?: boolean } = {}
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const form = pdfDoc.getForm();

  for (const [key, val] of Object.entries(dataMap)) {
    try {
      const field = form.getFieldMaybe(key);
      if (!field) continue;

      if (field instanceof PDFTextField) {
        field.setText(val === null || val === undefined ? '' : String(val));
      } else if (field instanceof PDFCheckBox) {
        if (val === true || val === 'true' || val === '1' || val === 'yes' || val === 'checked') {
          field.check();
        } else {
          field.uncheck();
        }
      } else if (field instanceof PDFRadioGroup) {
        field.select(String(val));
      } else if (field instanceof PDFDropdown) {
        field.select(String(val));
      } else if (field instanceof PDFOptionList) {
        field.select(String(val));
      }
    } catch (fieldErr) {
      // Skip fields that cannot accept the given value gracefully
    }
  }

  if (options.flatten) {
    form.flatten();
  }

  return await pdfDoc.save();
}
