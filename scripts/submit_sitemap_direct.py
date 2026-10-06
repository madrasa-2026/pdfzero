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
        print("Navigating directly to Sitemaps page...")
        gsc_page.goto("https://search.google.com/search-console/sitemaps?resource_id=https%3A%2F%2Fpdfzero.pages.dev%2F", wait_until="networkidle")
        gsc_page.wait_for_timeout(3000)
        print("URL:", gsc_page.url)
        
        # Check inputs
        inputs = gsc_page.locator('input')
        print("Input count:", inputs.count())
        for i in range(inputs.count()):
            inp = inputs.nth(i)
            print(f"Input {i}: placeholder={inp.get_attribute('placeholder')} aria-label={inp.get_attribute('aria-label')}")
            
        # Find sitemap input (usually has placeholder or is near https://pdfzero.pages.dev/)
        sitemap_inp = gsc_page.locator('input[aria-label*="sitemap"], input[placeholder*="sitemap"]').first
        if sitemap_inp.count() == 0:
            sitemap_inp = gsc_page.locator('input[type="text"]').last
            
        print("Filling sitemap-index.xml...")
        sitemap_inp.fill('sitemap-index.xml')
        gsc_page.wait_for_timeout(1000)
        
        # Find submit button
        submit_btn = gsc_page.locator('button:has-text("SUBMIT"), [role="button"]:has-text("SUBMIT")').first
        print("Submit enabled:", submit_btn.is_enabled())
        if submit_btn.is_enabled():
            submit_btn.click()
            gsc_page.wait_for_timeout(5000)
            
        with open('gsc_sitemap_live.txt', 'w', encoding='utf-8') as f:
            f.write(gsc_page.locator('body').inner_text())
        print("Wrote gsc_sitemap_live.txt!")
