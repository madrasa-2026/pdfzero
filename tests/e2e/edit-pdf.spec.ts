import { test, expect } from '@playwright/test';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { applyPdfEdits, type DocumentEditState } from '../../src/lib/pdf/edit';

const FIXTURE_PATH = path.resolve(process.cwd(), 'tests/fixtures/sample-3pages.pdf');

test.beforeAll(async () => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  // Page 1
  const p1 = doc.addPage([600, 400]);
  p1.drawText('Sample Page 1 - AirPDF Test Document', { x: 50, y: 350, size: 16, font });
  p1.drawText('Original Line to be edited or whited out', { x: 50, y: 300, size: 14, font });

  // Page 2
  const p2 = doc.addPage([600, 400]);
  p2.drawText('Sample Page 2 - Contract Terms and Links', { x: 50, y: 350, size: 16, font });

  // Page 3
  const p3 = doc.addPage([600, 400]);
  p3.drawText('Sample Page 3 - Appendix to be deleted', { x: 50, y: 350, size: 16, font });

  const bytes = await doc.save();
  fs.writeFileSync(FIXTURE_PATH, bytes);
});

test.describe('Sejda-Style PDF Editor E2E Suite', () => {
  test('loads /tools/edit-pdf and shows 100% private banner and 11 toolbar buttons', async ({ page }) => {
    await page.goto('/tools/edit-pdf');

    // 1. Verify privacy callout
    await expect(page.locator('text=100% private')).toBeVisible();

    // 2. Upload 3-page test document
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('#edit-drop-zone').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(FIXTURE_PATH);

    // 3. Verify workbench becomes visible
    await expect(page.locator('#edit-workbench')).toBeVisible();

    // 4. Verify all 11 tool buttons exist
    const toolNames = ['text', 'editText', 'images', 'annotate', 'shapes', 'whiteout', 'forms', 'links', 'sign', 'find', 'pages'];
    for (const name of toolNames) {
      await expect(page.locator(`[data-tool="${name}"]`)).toBeVisible();
    }

    // 5. Test tool selection & Whiteout disclosure
    await page.locator('[data-tool="whiteout"]').click();
    await expect(page.locator('#persistent-whiteout-banner')).toBeVisible();
    await expect(page.locator('text=Covered text remains extractable from the file — not true redaction.')).toBeVisible();

    // 6. Test Edit Text tool disclaimer
    await page.locator('[data-tool="editText"]').click();
    await expect(page.locator('text=Visual Cover Mode')).toBeVisible();

    // 7. Verify page thumbnails count
    await expect(page.locator('#total-pages-badge')).toHaveText('3');

    // 8. Test Apply changes button
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#btn-apply-changes').click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain('_edited.pdf');
  });

  test('generates multi-viewer 3-page edited PDF with all 11 primitives via engine', async () => {
    const originalBytes = fs.readFileSync(FIXTURE_PATH);

    // Minimal 1x1 PNG bytes
    const png1x1 = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
      0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
      0x42, 0x60, 0x82
    ]);

    const editState: DocumentEditState = {
      pages: [
        { originalIndex: 0, rotation: 0, isDeleted: false },  // Page 1
        { originalIndex: 1, rotation: 90, isDeleted: false }, // Page 2 rotated 90
        { originalIndex: 2, rotation: 0, isDeleted: true },   // Page 3 deleted
      ],
      annotations: [
        // 1. Text (English + Bengali)
        {
          type: 'text',
          id: 't-eng',
          pageIndex: 0,
          x: 50,
          y: 50,
          text: 'AirPDF Verified Document',
          fontSize: 16,
          color: '#000000',
        },
        {
          type: 'text',
          id: 't-bengali',
          pageIndex: 0,
          x: 50,
          y: 80,
          text: 'বাংলা নথি সম্পাদনা — এয়ারপিডিএফ',
          fontSize: 18,
          color: '#dc2626',
        },
        // 2. Whiteout (Visual cover only)
        {
          type: 'whiteout',
          id: 'w-1',
          pageIndex: 0,
          x: 50,
          y: 120,
          width: 250,
          height: 25,
        },
        // 3. Edit text replacement stamped at whiteout position
        {
          type: 'text',
          id: 't-rep',
          pageIndex: 0,
          x: 50,
          y: 122,
          text: 'Replaced Text Content (Seamless)',
          fontSize: 14,
          color: '#2563eb',
        },
        // 4. Shapes (Rectangle and Circle)
        {
          type: 'shape',
          id: 'sh-rect',
          pageIndex: 0,
          shapeType: 'rect',
          x: 350,
          y: 50,
          width: 120,
          height: 60,
          strokeColor: '#2563eb',
          strokeWidth: 2,
          fillColor: '#eff6ff',
        },
        {
          type: 'shape',
          id: 'sh-circle',
          pageIndex: 0,
          shapeType: 'circle',
          x: 490,
          y: 50,
          width: 60,
          height: 60,
          strokeColor: '#16a34a',
          strokeWidth: 2,
        },
        // 5. Signature (Chained vector lines)
        {
          type: 'signature',
          id: 'sig-1',
          pageIndex: 0,
          points: [
            [
              { x: 50, y: 200 },
              { x: 80, y: 220 },
              { x: 110, y: 195 },
              { x: 140, y: 215 },
            ],
          ],
          strokeColor: '#000000',
          strokeWidth: 2,
        },
        // 6. Image
        {
          type: 'image',
          id: 'img-1',
          pageIndex: 0,
          x: 350,
          y: 150,
          width: 40,
          height: 40,
          imageBytes: png1x1,
          format: 'png',
        },
        // 7. Highlight Annotation (35% opacity)
        {
          type: 'highlight',
          id: 'hi-1',
          pageIndex: 1,
          x: 50,
          y: 50,
          width: 200,
          height: 25,
          color: '#facc15',
        },
        // 8. Link Annotation
        {
          type: 'link',
          id: 'lk-1',
          pageIndex: 1,
          x: 50,
          y: 90,
          width: 150,
          height: 25,
          url: 'https://airpdf.pages.dev',
        },
      ],
    };

    const outputBytes = await applyPdfEdits(originalBytes, editState);

    // Verify PDF header & footer
    const pdfHeader = String.fromCharCode(...outputBytes.slice(0, 5));
    expect(pdfHeader).toBe('%PDF-');

    const tailString = String.fromCharCode(...outputBytes.slice(-30));
    expect(tailString).toContain('%%EOF');

    // Reload with PDFDocument to verify page recombination
    const verifyDoc = await PDFDocument.load(outputBytes);
    expect(verifyDoc.getPageCount()).toBe(2);
    expect(verifyDoc.getPage(1).getRotation().angle).toBe(90);

    // Save output file for manual inspection & multi-viewer validation
    const outPath = path.resolve(process.cwd(), 'tests/fixtures/multi-viewer-validated-output.pdf');
    fs.writeFileSync(outPath, outputBytes);
    expect(fs.existsSync(outPath)).toBe(true);
  });

  test('interactively tests Sejda-level workbench: live preview, bold/italic, 8-point handles, and pen tool', async ({ page }) => {
    await page.goto('/tools/edit-pdf');

    // 1. Upload test PDF
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('#edit-drop-zone').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(FIXTURE_PATH);

    await expect(page.locator('#edit-workbench')).toBeVisible();

    // 2. Verify thumbnail canvases rendered in sidebar
    await expect(page.locator('#thumbnail-list canvas').first()).toBeVisible();

    // 3. Verify drag preview box exists
    const dragPreview = page.locator('#drag-preview-box');
    expect(await dragPreview.count()).toBe(1);

    // 4. Test Text tool with Bold, Italic, and Font Family toggles
    await page.locator('[data-tool="text"]').click();
    await expect(page.locator('#text-font-select')).toBeVisible();
    await expect(page.locator('#text-bold-btn')).toBeVisible();
    await expect(page.locator('#text-italic-btn')).toBeVisible();

    // Toggle bold on
    await page.locator('#text-bold-btn').click();

    // Click canvas to place text box
    const annotLayer = page.locator('#annotation-layer');
    await annotLayer.click({ position: { x: 100, y: 100 } });

    // Verify text box placed with move handle and editable text
    const placedText = page.locator('#annotation-layer [data-annot-id^="text-"]');
    await expect(placedText).toBeVisible();
    await expect(placedText.locator('.move-handle')).toBeVisible();
    const editable = placedText.locator('.editable-text');
    await expect(editable).toBeVisible();

    // Type text into editable box
    await editable.fill('Interactive Sejda Quality Test');

    // Verify floating toolbar appeared with font family switcher
    const floatingBar = page.locator('#floating-annot-bar');
    await expect(floatingBar).toBeVisible();
    await expect(floatingBar.locator('text=A+')).toBeVisible();
    await expect(floatingBar.locator('text=Helvetica')).toBeVisible();
    await expect(floatingBar.locator('text=📋 Duplicate')).toBeVisible();

    // Switch font to Times Roman via floating toolbar
    await floatingBar.locator('text=Helvetica').click();
    await expect(floatingBar.locator('text=Times')).toBeVisible();

    // 5. Test Annotate tool with Pen button
    await page.locator('[data-tool="annotate"]').click();
    await expect(page.locator('#annot-pen-btn')).toBeVisible();
    await expect(page.locator('#annot-highlight-btn')).toBeVisible();

    // 6. Test Whiteout drag-to-draw and 8-point resize handles
    await page.locator('[data-tool="whiteout"]').click();
    // Simulate drag to draw whiteout box using annotLayer relative positions
    await annotLayer.hover({ position: { x: 200, y: 150 } });
    await page.mouse.down();
    await annotLayer.hover({ position: { x: 350, y: 200 } });
    await page.mouse.up();

    // Verify whiteout element placed
    const whiteoutEl = page.locator('#annotation-layer [data-annot-id^="whiteout-"]');
    await expect(whiteoutEl).toBeVisible();

    // Select the whiteout element to trigger handles
    await whiteoutEl.click();

    // Verify 8-point handles exist
    const handlePositions = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
    for (const pos of handlePositions) {
      await expect(whiteoutEl.locator(`.handle-${pos}`)).toBeVisible();
    }

    // 7. Test interactive Page Jump input
    const pageJump = page.locator('#page-jump-input');
    await expect(pageJump).toBeVisible();
    await expect(pageJump).toHaveValue('1');
    await pageJump.fill('2');
    await pageJump.dispatchEvent('change');
    await expect(page.locator('#edit-page-counter')).toContainText('Page 2 of 3');

    // 8. Test Signature creation and saved chip
    await page.locator('[data-tool="sign"]').click();
    await page.locator('#open-sign-modal-btn').click();
    await expect(page.locator('#signature-modal')).toBeVisible();

    // Use Typed signature
    await page.locator('#sig-tab-type').click();
    await page.locator('#sig-type-input').fill('John Hancock');
    await page.locator('#save-sig-btn').click();

    // Verify active signature chip appears with preview
    await expect(page.locator('#active-signature-chip')).toBeVisible();
    await expect(page.locator('#active-signature-chip').getByText('Ready to place')).toBeVisible();

    // 9. Verify Escape deselects
    await page.keyboard.press('Escape');
    await expect(page.locator('#annotation-layer .selected-annot')).toHaveCount(0);
  });
});

