# Specification: PDF Form Data Exporter & Importer (`/tools/form-data-pdf`)

## 1. Overview
The **PDF Form Data Exporter & Importer** solves one of the most frustrating administrative bottlenecks in PDF workflows: extracting answers from filled AcroForms into spreadsheets, and batch-populating empty form templates from spreadsheet records.

On **Adobe Acrobat Pro**, this feature requires a **\$239/year** subscription.

AirPDF's **Form Data Engine** operates 100% client-side in the browser:
- **Mode 1: Form Data Extraction (PDF ➔ CSV / JSON)**:
  - Parses AcroForm dictionaries (`PDFTextField`, `PDFCheckBox`, `PDFRadioGroup`, `PDFDropdown`).
  - Displays an interactive field table showing Field Name, Field Type, and Current Value.
  - One-click export to CSV (compatible with Excel/Google Sheets) and JSON.
- **Mode 2: Form Auto-Fill & Import (Template PDF + Data ➔ Filled PDF)**:
  - Takes a template PDF form and user-supplied JSON or key-value pairs.
  - Automatically matches field names and populates values.
  - Exports a filled, flattened or editable PDF document.
- Zero server uploads: Strict zero-trust privacy for confidential tax forms (W-9/I-9), medical records, and legal disclosures.

## 2. Technical Architecture
- **Engine (`src/lib/pdf/formDataEngine.ts`)**:
  - `extractFormData(pdfBytes: Uint8Array)`: Returns `{ fieldName: string, type: 'text' | 'checkbox' | 'radio' | 'dropdown' | 'button', value: string | boolean | string[] }[]`.
  - `populateForm(pdfBytes: Uint8Array, fieldValues: Record<string, string | boolean>, flatten?: boolean)`: Injects values into form fields and optionally flattens the AcroForm.
  - `fieldsToCsv(fields)` / `csvToFieldMap(csv)`: Helper serializers for Excel interoperability.
- **Island (`src/components/tools/FormDataPdfIsland.astro`)**:
  - Tabbed interface: "Export Form Data" and "Fill / Import Data".
  - Field Inspector with live search/filter.
  - Real-time filled preview.
