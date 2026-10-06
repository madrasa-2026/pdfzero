from playwright.sync_api import sync_playwright

with open(r'F:\OpenCode ANTI\Myquestionbank\web\playwright_session\DevToolsActivePort') as f:
    lines = [line.strip() for line in f]
ws_url = f'ws://127.0.0.1:{lines[0]}{lines[1]}'

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp(ws_url)
    context = browser.contexts[0]
    
    cf_page = None
    for page in context.pages:
        if 'pages/view/new/upload' in page.url:
            cf_page = page
            break
            
    if cf_page:
        print("Page URL:", cf_page.url)
        print("Page Title:", cf_page.title())
        
        # Check inputs
        inputs = cf_page.query_selector_all('input')
        for idx, inp in enumerate(inputs):
            print(f"Input {idx}: name={inp.get_attribute('name')} id={inp.get_attribute('id')} placeholder={inp.get_attribute('placeholder')} type={inp.get_attribute('type')}")
            
        # Check buttons
        buttons = cf_page.query_selector_all('button')
        for idx, btn in enumerate(buttons):
            txt = (btn.inner_text() or '').strip()
            if txt:
                print(f"Button {idx}: {txt}")
