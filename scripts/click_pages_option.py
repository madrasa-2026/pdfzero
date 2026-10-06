from playwright.sync_api import sync_playwright

with open(r'F:\OpenCode ANTI\Myquestionbank\web\playwright_session\DevToolsActivePort') as f:
    lines = [line.strip() for line in f]
ws_url = f'ws://127.0.0.1:{lines[0]}{lines[1]}'

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp(ws_url)
    context = browser.contexts[0]
    
    # Target the tab at workers-and-pages/create
    target_page = None
    for page in context.pages:
        if 'workers-and-pages/create' in page.url:
            target_page = page
            break
            
    if target_page:
        print("Target page URL:", target_page.url)
        # Find 'Continue to Pages'
        continue_btn = target_page.locator('text=Continue to Pages')
        if continue_btn.count() > 0:
            print("Clicking 'Continue to Pages'...")
            continue_btn.first.click()
            target_page.wait_for_timeout(3000)
            print("New URL:", target_page.url)
            target_page.screenshot(path="after_continue_pages.png")
        else:
            print("'Continue to Pages' not found, trying 'Upload your static files'...")
            upload_card = target_page.locator('text=Upload your static files')
            if upload_card.count() > 0:
                upload_card.first.click()
                target_page.wait_for_timeout(3000)
                print("New URL after upload click:", target_page.url)
                target_page.screenshot(path="after_upload_click.png")
