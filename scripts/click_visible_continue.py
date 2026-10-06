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
        elements = gsc_page.locator('button, [role="button"]')
        for i in range(elements.count()):
            el = elements.nth(i)
            txt = (el.inner_text() or '').strip()
            if 'continue' in txt.lower():
                print(f"Button {i}: visible={el.is_visible()} enabled={el.is_enabled()} text={txt}")
                if el.is_visible() and el.is_enabled():
                    print(f"Clicking visible Button {i}...")
                    el.click()
                    gsc_page.wait_for_timeout(5000)
                    print("After click body:\n", gsc_page.locator('body').inner_text()[:1000])
                    break
