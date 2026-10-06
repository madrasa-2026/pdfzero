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
        print("CF Page URL:", cf_page.url)
        cont_btn = cf_page.locator('text=Continue to project')
        if cont_btn.count() > 0:
            cont_btn.first.click()
            cf_page.wait_for_timeout(4000)
            print("Navigated to project URL:", cf_page.url)
        else:
            cf_page.goto("https://dash.cloudflare.com/91409691c1a7d522433d0bab4f9fe39c/pages/view/pdfzero", wait_until="networkidle")
            cf_page.wait_for_timeout(3000)
            print("Direct to project URL:", cf_page.url)
            
        print("Project page text:\n", cf_page.locator('body').inner_text()[:600])
