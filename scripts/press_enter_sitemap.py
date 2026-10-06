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
        sitemap_inp = gsc_page.locator('input[aria-label="Enter sitemap URL"]').first
        print("Filling sitemap-index.xml...")
        sitemap_inp.fill('sitemap-index.xml')
        gsc_page.wait_for_timeout(1000)
        
        # Check visible submit buttons
        submits = gsc_page.locator('button, [role="button"]')
        clicked = False
        for i in range(submits.count()):
            btn = submits.nth(i)
            if 'submit' in (btn.inner_text() or '').lower() and btn.is_visible():
                print(f"Clicking visible submit button {i}: {btn.inner_text()}")
                btn.click()
                clicked = True
                break
                
        if not clicked:
            print("Pressing Enter on sitemap input...")
            sitemap_inp.press('Enter')
            
        gsc_page.wait_for_timeout(6000)
        
        # Check page text
        with open('sitemap_sub_status.txt', 'w', encoding='utf-8') as f:
            f.write(gsc_page.locator('body').inner_text())
        print("Wrote sitemap_sub_status.txt!")
