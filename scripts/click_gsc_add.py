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
        add_btn = gsc_page.locator('text=Add a website')
        if add_btn.count() > 0:
            add_btn.first.click()
            gsc_page.wait_for_timeout(2000)
            
        print("Page text after clicking Add a website:")
        print(gsc_page.locator('body').inner_text()[:600])
        gsc_page.screenshot(path="gsc_modal.png")
