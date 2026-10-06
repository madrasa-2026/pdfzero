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
        print("Page URL:", target_page.url)
        target_page.screenshot(path="cf_create_pages_wizard.png")
        
        cards = target_page.query_selector_all('button, a, input, div[role="button"]')
        for c in cards:
            tag = c.evaluate('e => e.tagName')
            txt = (c.inner_text() or '').strip().replace('\n', ' -- ')
            if tag == 'INPUT':
                txt = f"INPUT: name={c.get_attribute('name')} id={c.get_attribute('id')} placeholder={c.get_attribute('placeholder')}"
            if txt:
                print(f"[{tag}] {txt}")
