from playwright.sync_api import sync_playwright

with open(r'F:\OpenCode ANTI\Myquestionbank\web\playwright_session\DevToolsActivePort') as f:
    lines = [line.strip() for line in f]
ws_url = f'ws://127.0.0.1:{lines[0]}{lines[1]}'

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp(ws_url)
    context = browser.contexts[0]
    
    cf_page = None
    for page in context.pages:
        if 'pages/view/pdfzero' in page.url:
            cf_page = page
            break
            
    if cf_page:
        buttons = cf_page.locator('main button, main a, [role="main"] button, [role="main"] a')
        print("Buttons in main count:", buttons.count())
        for i in range(buttons.count()):
            txt = (buttons.nth(i).inner_text() or '').strip().replace('\n', ' -- ')
            if txt:
                print(f"Action {i}: {txt}")
