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
        print("Clicking VERIFY in Google Search Console...")
        verify_btn = gsc_page.locator('button:has-text("VERIFY"), [role="button"]:has-text("VERIFY")').first
        print("Verify btn enabled:", verify_btn.is_enabled())
        verify_btn.click()
        gsc_page.wait_for_timeout(8000)
        
        with open('gsc_verify_result.txt', 'w', encoding='utf-8') as f:
            f.write(gsc_page.locator('body').inner_text())
        print("Saved gsc_verify_result.txt")
