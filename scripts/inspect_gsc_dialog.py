from playwright.sync_api import sync_playwright

with open(r'F:\OpenCode ANTI\Myquestionbank\web\playwright_session\DevToolsActivePort') as f:
    lines = [line.strip() for line in f]
ws_url = f'ws://127.0.0.1:{lines[0]}{lines[1]}'

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp(ws_url)
    context = browser.contexts[0]
    
    gsc_page = None
    for page in context.pages:
        if 'search-console' in page.url:
            gsc_page = page
            break
            
    if gsc_page:
        text = gsc_page.locator('body').inner_text()
        with open('gsc_dialog.txt', 'w', encoding='utf-8') as f:
            f.write(text)
        print("Wrote gsc_dialog.txt successfully!")
        
        # Check for HTML file or HTML tag info
        if 'HTML tag' in text:
            print("Found HTML tag option!")
        if 'HTML file' in text:
            print("Found HTML file option!")
            
        gsc_page.screenshot(path="gsc_verification_dialog.png")
