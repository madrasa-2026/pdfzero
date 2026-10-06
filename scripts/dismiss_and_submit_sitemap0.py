from playwright.sync_api import sync_playwright

with open(r'F:\OpenCode ANTI\Myquestionbank\web\playwright_session\DevToolsActivePort') as f:
    lines = [line.strip() for line in f]
ws_url = f'ws://127.0.0.1:{lines[0]}{lines[1]}'

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp(ws_url)
    context = browser.contexts[0]
    
    gsc_page = None
    for page in context.pages:
        if 'search-console/sitemaps' in page.url or 'search-console' in page.url:
            gsc_page = page
            break
            
    if gsc_page:
        # Dismiss overlay by clicking anywhere or pressing Escape
        gsc_page.keyboard.press('Escape')
        gsc_page.wait_for_timeout(1000)
        
        # Click Dismiss or Got it if present
        btn = gsc_page.locator('text=Dismiss, text=Got it')
        if btn.count() > 0 and btn.first.is_visible():
            btn.first.click()
            gsc_page.wait_for_timeout(1000)
            
        sitemap_inp = gsc_page.locator('input[aria-label="Enter sitemap URL"]').first
        sitemap_inp.fill('sitemap-0.xml')
        sitemap_inp.press('Enter')
        gsc_page.wait_for_timeout(5000)
        
        with open('sitemaps_final_list.txt', 'w', encoding='utf-8') as f:
            f.write(gsc_page.locator('body').inner_text())
        print("Done! Sitemaps page text saved.")
