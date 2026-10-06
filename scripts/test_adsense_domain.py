from playwright.sync_api import sync_playwright

with open(r'F:\OpenCode ANTI\Myquestionbank\web\playwright_session\DevToolsActivePort') as f:
    lines = [line.strip() for line in f]
ws_url = f'ws://127.0.0.1:{lines[0]}{lines[1]}'

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp(ws_url)
    context = browser.contexts[0]
    
    adsense_page = None
    for page in context.pages:
        if 'adsense' in page.url:
            adsense_page = page
            break
            
    if adsense_page:
        site_inp = adsense_page.locator('input[aria-label="Website"]').first
        site_inp.fill('pdfzero.pages.dev')
        adsense_page.wait_for_timeout(1000)
        
        # Check if any error text appears
        error_el = adsense_page.locator('[role="alert"], .error, span:has-text("domain"), span:has-text("URL")')
        print("Error elements count:", error_el.count())
        for i in range(error_el.count()):
            print("Error text:", error_el.nth(i).inner_text())
            
        print("Page text snippet around website:\n", adsense_page.locator('body').inner_text()[:400])
