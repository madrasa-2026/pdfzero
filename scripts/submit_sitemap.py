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
        print("Clicking GO TO PROPERTY...")
        go_btn = gsc_page.locator('text=GO TO PROPERTY')
        if go_btn.count() > 0:
            go_btn.first.click()
            gsc_page.wait_for_timeout(4000)
            print("Property URL:", gsc_page.url)
            
        # Navigate to Sitemaps tab
        # Google Search console URL for sitemaps is https://search.google.com/search-console/sitemaps?resource_id=https%3A%2F%2Fpdfzero.pages.dev%2F
        gsc_page.goto("https://search.google.com/search-console/sitemaps?resource_id=https%3A%2F%2Fpdfzero.pages.dev%2F", wait_until="networkidle")
        gsc_page.wait_for_timeout(3000)
        print("Sitemaps URL:", gsc_page.url)
        
        # Enter sitemap-index.xml
        inp = gsc_page.locator('input[placeholder*="sitemap"], input[aria-label*="sitemap"]').first
        if inp.count() == 0:
            # try finding any text input on sitemaps page
            inp = gsc_page.locator('form input[type="text"], input[type="text"]').last
            
        print("Sitemap input found:", inp.count())
        if inp.count() > 0:
            inp.fill('sitemap-index.xml')
            gsc_page.wait_for_timeout(1000)
            
            submit_btn = gsc_page.locator('button:has-text("SUBMIT"), [role="button"]:has-text("SUBMIT")').first
            print("Submit btn enabled:", submit_btn.is_enabled())
            submit_btn.click()
            gsc_page.wait_for_timeout(5000)
            
        with open('gsc_sitemap_result.txt', 'w', encoding='utf-8') as f:
            f.write(gsc_page.locator('body').inner_text())
        print("Saved sitemap submission result!")
