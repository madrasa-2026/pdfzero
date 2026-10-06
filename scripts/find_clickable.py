from playwright.sync_api import sync_playwright

with open(r'F:\OpenCode ANTI\Myquestionbank\web\playwright_session\DevToolsActivePort') as f:
    lines = [line.strip() for line in f]
ws_url = f'ws://127.0.0.1:{lines[0]}{lines[1]}'

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp(ws_url)
    context = browser.contexts[0]
    for page in context.pages:
        if 'dash.cloudflare.com' in page.url:
            print("URL:", page.url)
            cards = page.query_selector_all('button, a, div[role="button"]')
            for c in cards:
                txt = (c.inner_text() or '').strip()
                if any(k in txt.lower() for k in ['pages', 'github', 'upload', 'static', 'create', 'continue']):
                    print("CLICKABLE:", txt.replace('\n', ' -- '))
