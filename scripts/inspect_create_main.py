from playwright.sync_api import sync_playwright

with open(r'F:\OpenCode ANTI\Myquestionbank\web\playwright_session\DevToolsActivePort') as f:
    lines = [line.strip() for line in f]
ws_url = f'ws://127.0.0.1:{lines[0]}{lines[1]}'

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp(ws_url)
    context = browser.contexts[0]
    
    cf_page = None
    for page in context.pages:
        if 'dash.cloudflare.com' in page.url:
            cf_page = page
            break
            
    if cf_page:
        cf_page.goto("https://dash.cloudflare.com/91409691c1a7d522433d0bab4f9fe39c/workers-and-pages/create", wait_until="networkidle")
        cf_page.wait_for_timeout(2000)
        print("At:", cf_page.url)
        cf_page.screenshot(path="cf_create_loaded.png")
        
        # Let's see all links or buttons inside the main content area
        links = cf_page.query_selector_all('main a, main button')
        for el in links:
            txt = el.inner_text().strip().replace('\n', ' -- ')
            href = el.get_attribute('href')
            print(f"[{el.evaluate('e => e.tagName')}] href={href} | {txt}")
