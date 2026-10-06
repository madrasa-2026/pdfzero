from playwright.sync_api import sync_playwright

with open(r'F:\OpenCode ANTI\Myquestionbank\web\playwright_session\DevToolsActivePort') as f:
    lines = [line.strip() for line in f]
ws_url = f'ws://127.0.0.1:{lines[0]}{lines[1]}'

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp(ws_url)
    context = browser.contexts[0]
    
    gsc_page = None
    for page in context.pages:
        if 'search-console' in page.url:
            gsc_page = page
            break
            
    if gsc_page:
        # Fill input with aria-label https://www.example.com
        inp = gsc_page.locator('input[aria-label="https://www.example.com"]').first
        inp.fill('https://pdfzero.pages.dev/')
        gsc_page.wait_for_timeout(1000)
        
        # Click the continue button corresponding to URL prefix
        # It's usually the second CONTINUE button or near the input
        parent = inp.locator('..').locator('..').locator('..').locator('..')
        continue_btn = parent.locator('text=CONTINUE')
        print("Continue button count in parent:", continue_btn.count())
        if continue_btn.count() > 0:
            print("Clicking parent continue button...")
            continue_btn.first.click()
        else:
            print("Clicking last CONTINUE button on page...")
            gsc_page.locator('text=CONTINUE').last.click()
            
        gsc_page.wait_for_timeout(6000)
        print("Page text after submitting:\n", gsc_page.locator('body').inner_text()[:1200])
        gsc_page.screenshot(path="gsc_verification_status.png")
