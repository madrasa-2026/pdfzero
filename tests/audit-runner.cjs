const { chromium } = require('@playwright/test');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));

  console.log('1. Navigating to edit-pdf...');
  await page.goto('https://airpdf.pages.dev/tools/edit-pdf', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'audit-01-landing.png' });

  console.log('2. Uploading sample-3pages.pdf...');
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.locator('#edit-drop-zone').click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(path.resolve('tests/fixtures/sample-3pages.pdf'));

  await page.waitForSelector('#edit-workbench', { state: 'visible' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'audit-02-workbench.png' });

  // Test 1: Click Text tool and click page
  console.log('3. Placing text...');
  await page.locator('[data-tool="text"]').click();
  const annotLayer = page.locator('#annotation-layer');
  await annotLayer.click({ position: { x: 120, y: 140 } });
  await page.waitForTimeout(500);
  const textInput = page.locator('.editable-text');
  await textInput.fill('Normal User Friendly Text Heading');
  await page.screenshot({ path: 'audit-03-text-placed.png' });

  // Test 2: Click Shapes tool and draw rectangle
  console.log('4. Drawing shape...');
  await page.locator('[data-tool="shapes"]').click();
  await annotLayer.hover({ position: { x: 300, y: 220 } });
  await page.mouse.down();
  await annotLayer.hover({ position: { x: 480, y: 300 } });
  await page.mouse.up();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'audit-04-shape-drawn.png' });

  // Test 3: Click Whiteout tool and draw whiteout
  console.log('5. Drawing whiteout...');
  await page.locator('[data-tool="whiteout"]').click();
  await annotLayer.hover({ position: { x: 50, y: 200 } });
  await page.mouse.down();
  await annotLayer.hover({ position: { x: 260, y: 230 } });
  await page.mouse.up();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'audit-05-whiteout.png' });

  // Test 4: Signature modal
  console.log('6. Opening signature modal...');
  await page.locator('[data-tool="sign"]').click();
  await page.locator('#open-sign-modal-btn').click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'audit-06-signature-modal.png' });

  console.log('Errors logged:', errors);
  await browser.close();
})();
