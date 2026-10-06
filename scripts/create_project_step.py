from playwright.sync_api import sync_playwright

with open(r'F:\OpenCode ANTI\Myquestionbank\web\playwright_session\DevToolsActivePort') as f:
    lines = [line.strip() for line in f]
ws_url = f'ws://127.0.0.1:{lines[0]}{lines[1]}'

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp(ws_url)
    context = browser.contexts[0]
    
    target_page = None
    for page in context.pages:
        if 'pages/new/upload' in page.url:
            target_page = page
            break
            
    if target_page:
        # Fill project name
        input_el = target_page.locator('input[name="projectName"]')
        input_el.fill('pdfzero')
        target_page.wait_for_timeout(1000)
        
        # Check Create project button
        create_btn = target_page.locator('text=Create project')
        print("Create project button enabled:", create_btn.is_enabled())
        print("Create project text:", create_btn.inner_text())
        
        create_btn.click()
        target_page.wait_for_timeout(3000)
        print("URL after clicking Create project:", target_page.url)
        target_page.screenshot(path="after_create_project.png")
