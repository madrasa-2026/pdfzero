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
        # Find URL prefix input
        url_input = gsc_page.locator('input[placeholder*="https://www.example.com"], input[placeholder*="example.com"]').last
        print("URL input tag:", url_input.evaluate('e => e.outerHTML'))
        url_input.fill('https://pdfzero.pages.dev/')
        gsc_page.wait_for_timeout(1000)
        
        # Click Continue under URL prefix
        continue_btn = gsc_page.locator('text=CONTINUE').last
        print("Continue enabled:", continue_btn.is_enabled())
        continue_btn.click()
        
        gsc_page.wait_for_timeout(6000)
        print("Page text after submitting URL prefix:")
        print(gsc_page.locator('body').inner_text()[:1000])
        gsc_page.screenshot(path="gsc_verify_modal.png")
