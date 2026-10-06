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
        card1 = target_page.locator('div[data-sentry-component="Card"]').nth(1)
        print("Card 1 text:", card1.inner_text().replace('\n', ' -- '))
        btn = card1.locator('button, a').first
        btn.click()
        target_page.wait_for_timeout(3000)
        print("URL after clicking Card 1:", target_page.url)
        target_page.screenshot(path="card1_upload_screen.png")
