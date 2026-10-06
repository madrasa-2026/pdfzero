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
        # Check download link for google08c3c147cd1db576.html
        link = gsc_page.locator('text=google08c3c147cd1db576.html')
        print("Link count:", link.count())
        if link.count() > 0:
            parent_a = link.first.locator('xpath=ancestor-or-self::a')
            if parent_a.count() > 0:
                print("Download href:", parent_a.get_attribute('href'))
                
        # Also check HTML tag option to get the meta tag as backup!
        tag_btn = gsc_page.locator('text=HTML tag')
        if tag_btn.count() > 0:
            tag_btn.first.click()
            gsc_page.wait_for_timeout(1000)
            tag_section = gsc_page.locator('text=Copy the meta tag below').locator('..').locator('..')
            if tag_section.count() > 0:
                print("HTML meta tag info:\n", tag_section.inner_text())
