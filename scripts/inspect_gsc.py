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
        print("Search Console URL:", gsc_page.url)
        print("Search Console Title:", gsc_page.title())
        gsc_page.screenshot(path="gsc_welcome.png")
        
        inputs = gsc_page.query_selector_all('input')
        for i, inp in enumerate(inputs):
            print(f"Input {i}: placeholder={inp.get_attribute('placeholder')} value={inp.get_attribute('value')} aria-label={inp.get_attribute('aria-label')}")
            
        buttons = gsc_page.query_selector_all('button, [role="button"]')
        for i, btn in enumerate(buttons):
            txt = (btn.inner_text() or '').strip().replace('\n', ' -- ')
            if txt:
                print(f"Button {i}: {txt}")
