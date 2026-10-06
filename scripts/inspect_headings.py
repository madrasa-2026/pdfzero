from playwright.sync_api import sync_playwright

with open(r'F:\OpenCode ANTI\Myquestionbank\web\playwright_session\DevToolsActivePort') as f:
    lines = [line.strip() for line in f]
ws_url = f'ws://127.0.0.1:{lines[0]}{lines[1]}'

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp(ws_url)
    context = browser.contexts[0]
    for page in context.pages:
        if 'pages' in page.url:
            print("Checking page:", page.url)
            elements = page.query_selector_all('h1, h2, h3, h4, input, button')
            for el in elements:
                t = el.evaluate('e => e.tagName')
                txt = el.inner_text().strip().replace('\n', ' ') if t != 'INPUT' else el.get_attribute('placeholder') or el.get_attribute('value') or el.get_attribute('name')
                if txt:
                    print(f"[{t}] {txt[:80]}")
