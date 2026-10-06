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
        links = target_page.locator('text=Get started')
        print("Get started count:", links.count())
        for i in range(links.count()):
            el = links.nth(i)
            parent = el.locator('..').locator('..')
            print(f"--- Option {i} ---")
            print("Href:", el.get_attribute('href'))
            print("Card text:", parent.inner_text().replace('\n', ' -- '))
