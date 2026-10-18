import { PDFDocument, rgb } from 'pdf-lib';

export type FieldType = 'text' | 'checkbox' | 'dropdown';

export interface FormFieldDefinition {
  id: string;
  name: string;
  type: FieldType;
  pageIndex: number;
  x: number;      // PDF pt coordinates (from bottom-left)
  y: number;
  width: number;
  height: number;
  defaultValue?: string;
  isMultiline?: boolean;
  checked?: boolean;
  options?: string[]; // For dropdowns
  required?: boolean;
}

export interface ExistingFormFieldInfo {
  name: string;
  type: string;
}

export interface ExtractedTextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Injects interactive AcroForm fields into a PDF document.
 */
export async function injectFormFields(
  pdfBytes: Uint8Array,
  fields: FormFieldDefinition[]
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const form = doc.getForm();
  const pages = doc.getPages();

  const lightBlueBg = rgb(0.94, 0.97, 1.0);
  const borderColor = rgb(0.4, 0.6, 0.9);
  const textColor = rgb(0.1, 0.1, 0.1);

  // Group or sanitize names to ensure uniqueness if multiple fields have same name
  const usedNames = new Set<string>();

  for (const field of fields) {
    if (field.pageIndex < 0 || field.pageIndex >= pages.length) {
      continue;
    }
    const targetPage = pages[field.pageIndex];

    let fieldName = (field.name || `field_${field.id}`).trim().replace(/[^a-zA-Z0-9_]/g, '_');
    if (!fieldName) fieldName = `field_${field.id}`;
    let uniqueName = fieldName;
    let counter = 1;
    while (usedNames.has(uniqueName)) {
      uniqueName = `${fieldName}_${counter++}`;
    }
    usedNames.add(uniqueName);

    try {
      if (field.type === 'text') {
        const tf = form.createTextField(uniqueName);
        if (field.isMultiline) {
          tf.enableMultiline();
        }
        if (field.defaultValue) {
          tf.setText(field.defaultValue);
        }
        tf.addToPage(targetPage, {
          x: Math.max(0, field.x),
          y: Math.max(0, field.y),
          width: Math.max(15, field.width),
          height: Math.max(12, field.height),
          textColor,
          backgroundColor: lightBlueBg,
          borderColor,
          borderWidth: 1
        });
      } else if (field.type === 'checkbox') {
        const cb = form.createCheckBox(uniqueName);
        if (field.checked) {
          cb.check();
        } else {
          cb.uncheck();
        }
        cb.addToPage(targetPage, {
          x: Math.max(0, field.x),
          y: Math.max(0, field.y),
          width: Math.max(12, field.width),
          height: Math.max(12, field.height),
          borderColor,
          borderWidth: 1
        });
      } else if (field.type === 'dropdown') {
        const dd = form.createDropdown(uniqueName);
        const options = field.options && field.options.length > 0 ? field.options : ['Option 1', 'Option 2'];
        dd.addOptions(options);
        if (field.defaultValue && options.includes(field.defaultValue)) {
          dd.select(field.defaultValue);
        } else if (options.length > 0) {
          dd.select(options[0]);
        }
        dd.addToPage(targetPage, {
          x: Math.max(0, field.x),
          y: Math.max(0, field.y),
          width: Math.max(30, field.width),
          height: Math.max(15, field.height),
          textColor,
          backgroundColor: lightBlueBg,
          borderColor,
          borderWidth: 1
        });
      }
    } catch (err) {
      console.warn(`Failed to inject field ${uniqueName}:`, err);
    }
  }

  return await doc.save();
}

/**
 * Summarizes existing AcroForm fields in a PDF.
 */
export async function getExistingFormFieldsSummary(
  pdfBytes: Uint8Array
): Promise<ExistingFormFieldInfo[]> {
  try {
    const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const form = doc.getForm();
    const fields = form.getFields();

    return fields.map(f => ({
      name: f.getName(),
      type: f.constructor.name
    }));
  } catch {
    return [];
  }
}

/**
 * Scans page text items to detect fillable blank underscores, colon prompts, and bracket checkboxes.
 */
export function detectFormFieldsFromText(
  textItems: ExtractedTextItem[],
  pageWidth: number,
  pageHeight: number,
  pageIndex: number = 0
): FormFieldDefinition[] {
  const detected: FormFieldDefinition[] = [];
  let idCounter = 1;

  for (let i = 0; i < textItems.length; i++) {
    const item = textItems[i];
    const text = item.str.trim();

    // 1. Detect underline blank (e.g. "___________" or ".....")
    if (/^_{3,}$/.test(text) || /^\.{4,}$/.test(text)) {
      detected.push({
        id: `auto_${idCounter++}`,
        name: `blank_${idCounter}`,
        type: 'text',
        pageIndex,
        x: item.x,
        y: Math.max(0, item.y - 4),
        width: Math.max(item.width, 120),
        height: 20,
        isMultiline: false
      });
      continue;
    }

    // 2. Detect checkbox brackets "[ ]" or "( )" or Unicode box "□"
    if (text.includes('[ ]') || text.includes('( )') || text.includes('\u25A1') || text.includes('\u25A2')) {
      detected.push({
        id: `auto_${idCounter++}`,
        name: `checkbox_${idCounter}`,
        type: 'checkbox',
        pageIndex,
        x: item.x,
        y: Math.max(0, item.y - 2),
        width: 16,
        height: 16,
        checked: false
      });
      continue;
    }

    // 3. Detect colon label prompt (e.g. "Full Name:", "Email:") followed by whitespace
    if (text.endsWith(':') && text.length > 2 && text.length < 35) {
      // Check if another text item immediately follows on the right
      const hasAdjacentRight = textItems.some(
        other => other !== item &&
          Math.abs(other.y - item.y) < 8 &&
          other.x > item.x &&
          other.x < item.x + item.width + 60
      );

      if (!hasAdjacentRight) {
        // Safe to place a field right after the prompt label
        const fieldX = item.x + item.width + 6;
        const availableWidth = Math.min(220, Math.max(120, pageWidth - fieldX - 40));

        if (availableWidth > 50) {
          const cleanName = text.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
          detected.push({
            id: `auto_${idCounter++}`,
            name: `${cleanName}_${idCounter}`,
            type: 'text',
            pageIndex,
            x: fieldX,
            y: Math.max(0, item.y - 4),
            width: availableWidth,
            height: 20,
            isMultiline: false
          });
        }
      }
    }
  }

  return detected;
}
