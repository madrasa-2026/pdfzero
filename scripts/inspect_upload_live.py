from playwright.sync_api import sync_playwright

with open(r'F:\OpenCode ANTI\Myquestionbank\web\playwright_session\DevToolsActivePort') as f:
    lines = [line.strip() for line in f]
ws_url = f'ws://127.0.0.1:{lines[0]}{lines[1]}'

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp(ws_url)
    context = browser.contexts[0]
    
    target_page = None
    for page in context.pages:
        if 'pages/new/upload' in page.url:
            target_page = page
            break
            
    if target_page:
        print("Page URL:", target_page.url)
        target_page.screenshot(path="cf_upload_form_live.png")
        
        inputs = target_page.query_selector_all('input')
        for i, inp in enumerate(inputs):
            print(f"INPUT {i}: name={inp.get_attribute('name')} id={inp.get_attribute('id')} placeholder={inp.get_attribute('placeholder')} type={inp.get_attribute('type')}")
            
        buttons = target_page.query_selector_all('button')
        for i, btn in enumerate(buttons):
            txt = (btn.inner_text() or '').strip().replace('\n', ' -- ')
            if txt:
                print(f"BUTTON {i}: {txt}")
