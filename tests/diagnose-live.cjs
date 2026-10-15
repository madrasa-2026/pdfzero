const { chromium } = require('@playwright/test');
const path = require('node:path');
const fs = require('node:fs');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const logs = [];
  const failedRequests = [];

  page.on('console', msg => {
    logs.push({ type: msg.type(), text: msg.text() });
    console.log(`[BROWSER ${msg.type().toUpperCase()}] ${msg.text()}`);
  });

  page.on('pageerror', err => {
    logs.push({ type: 'pageerror', text: err.message, stack: err.stack });
    console.log(`[PAGE ERROR] ${err.message}`);
  });

  page.on('requestfailed', req => {
    failedRequests.push({ url: req.url(), failure: req.failure() });
    console.log(`[REQ FAILED] ${req.url()} - ${JSON.stringify(req.failure())}`);
  });

  page.on('response', res => {
    if (res.status() >= 400) {
      console.log(`[HTTP ${res.status()}] ${res.url()}`);
    }
  });

  console.log('--- Step 1: Navigating to https://airpdf.pages.dev/tools/edit-pdf ---');
  const response = await page.goto('https://airpdf.pages.dev/tools/edit-pdf', { waitUntil: 'networkidle' });
  console.log(`HTTP Status: ${response.status()}`);
  await page.screenshot({ path: 'diagnose-01-landing.png', fullPage: true });

  console.log('--- Step 2: Uploading sample PDF ---');
  const fixturePath = path.resolve('tests/fixtures/sample-3pages.pdf');
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.locator('#edit-drop-zone').click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(fixturePath);

  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'diagnose-02-after-upload.png' });

  // Check if workbench is visible
  const isWorkbenchVisible = await page.locator('#edit-workbench').isVisible();
  console.log(`Workbench visible: ${isWorkbenchVisible}`);

  // Check if canvas rendered
  const canvasBox = await page.locator('#pdf-page-canvas').boundingBox();
  console.log('PDF Canvas Box:', canvasBox);

  // Check thumbnails
  const thumbCount = await page.locator('#thumbnail-list > div').count();
  console.log(`Thumbnails count: ${thumbCount}`);

  // Test Text tool
  console.log('--- Step 3: Testing Text placement ---');
  await page.locator('[data-tool="text"]').click();
  await page.locator('#annotation-layer').click({ position: { x: 100, y: 100 } });
  await page.waitForTimeout(500);
  const textInput = page.locator('.editable-text');
  const textCount = await textInput.count();
  console.log(`Text inputs created: ${textCount}`);
  if (textCount > 0) {
    await textInput.first().fill('Hello AirPDF World');
  }
  await page.screenshot({ path: 'diagnose-03-text-tool.png' });

  // Test Shapes tool
  console.log('--- Step 4: Testing Shape tool ---');
  await page.locator('[data-tool="shapes"]').click();
  const annotLayer = page.locator('#annotation-layer');
  await annotLayer.hover({ position: { x: 250, y: 150 } });
  await page.mouse.down();
  await annotLayer.hover({ position: { x: 400, y: 250 } });
  await page.mouse.up();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'diagnose-04-shape-tool.png' });

  // Test Whiteout tool
  console.log('--- Step 5: Testing Whiteout tool ---');
  await page.locator('[data-tool="whiteout"]').click();
  await annotLayer.hover({ position: { x: 50, y: 200 } });
  await page.mouse.down();
  await annotLayer.hover({ position: { x: 220, y: 240 } });
  await page.mouse.up();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'diagnose-05-whiteout-tool.png' });

  // Test Apply changes / Export
  console.log('--- Step 6: Testing Apply Changes ---');
  let downloadFailed = false;
  try {
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
    await page.locator('#btn-apply-changes').click();
    const download = await downloadPromise;
    const downloadPath = path.resolve('diagnose-output.pdf');
    await download.saveAs(downloadPath);
    console.log(`Download saved: ${downloadPath}, size: ${fs.statSync(downloadPath).size} bytes`);
  } catch (err) {
    downloadFailed = true;
    console.error('Download error:', err.message);
  }
  await page.screenshot({ path: 'diagnose-06-after-apply.png' });

  console.log('\n--- Summary of issues ---');
  console.log('Logs with error/warn:', logs.filter(l => l.type === 'error' || l.type === 'warning' || l.type === 'pageerror'));
  console.log('Failed requests:', failedRequests);

  await browser.close();
})();
