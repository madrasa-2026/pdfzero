from playwright.sync_api import sync_playwright

with open(r'F:\OpenCode ANTI\Myquestionbank\web\playwright_session\DevToolsActivePort') as f:
    lines = [line.strip() for line in f]
ws_url = f'ws://127.0.0.1:{lines[0]}{lines[1]}'

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp(ws_url)
    context = browser.contexts[0]
    
    target_page = None
    for page in context.pages:
        if 'pages' in page.url:
            target_page = page
            break
            
    if target_page:
        print("URL:", target_page.url)
        main = target_page.get_by_role("main").nth(1)
        print("Text:\n", main.inner_text())
        
        deploy_btn = target_page.locator('text=Deploy site')
        print("Deploy site count:", deploy_btn.count())
        if deploy_btn.count() > 0:
            print("Deploy site enabled:", deploy_btn.first.is_enabled())
            if deploy_btn.first.is_enabled():
                print("Clicking Deploy site...")
                deploy_btn.first.click()
                target_page.wait_for_timeout(5000)
                print("New URL after clicking deploy:", target_page.url)
                print("New text after deploy:\n", target_page.get_by_role("main").nth(1).inner_text())
