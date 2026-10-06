from playwright.sync_api import sync_playwright

with open(r'F:\OpenCode ANTI\Myquestionbank\web\playwright_session\DevToolsActivePort') as f:
    lines = [line.strip() for line in f]
ws_url = f'ws://127.0.0.1:{lines[0]}{lines[1]}'

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp(ws_url)
    context = browser.contexts[0]
    
    target_page = None
    for page in context.pages:
        if 'create/pages' in page.url:
            target_page = page
            break
            
    if target_page:
        cards = target_page.locator('div[data-sentry-component="Card"]')
        print("Card count:", cards.count())
        for i in range(cards.count()):
            c = cards.nth(i)
            print(f"=== Card {i} ===")
            print(c.inner_text().replace('\n', ' -- '))
            btn = c.locator('button, a')
            if btn.count() > 0:
                print("Button in card:", btn.first.inner_text())
