from playwright.sync_api import sync_playwright

with open(r'F:\OpenCode ANTI\Myquestionbank\web\playwright_session\DevToolsActivePort') as f:
    lines = [line.strip() for line in f]
ws_url = f'ws://127.0.0.1:{lines[0]}{lines[1]}'

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp(ws_url)
    context = browser.contexts[0]
    
    cf_page = None
    for page in context.pages:
        print(f"Tab: {page.title()} | {page.url}")
        if 'dash.cloudflare.com' in page.url:
            cf_page = page
            
    if cf_page:
        print("Found Cloudflare tab:", cf_page.url)
        # Navigate to Pages create upload
        cf_page.goto("https://dash.cloudflare.com/91409691c1a7d522433d0bab4f9fe39c/pages/view/new/upload", wait_until="networkidle")
        print("Navigated to:", cf_page.url)
        cf_page.screenshot(path="cf_upload_direct.png")
    else:
        print("No Cloudflare tab found!")
