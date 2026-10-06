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
        # Find the meta tag text or input
        inputs = gsc_page.locator('input[readonly], span[class*="code"], div[class*="code"]')
        for i in range(inputs.count()):
            val = inputs.nth(i).get_attribute('value') or inputs.nth(i).inner_text()
            if 'google-site-verification' in str(val):
                print("FOUND META TAG:", val)
                
        # Also let's click the download link for google08c3c147cd1db576.html
        dl_link = gsc_page.locator('text=google08c3c147cd1db576.html')
        if dl_link.count() > 0:
            with gsc_page.expect_download() as download_info:
                dl_link.first.click()
            download = download_info.value
            download.save_as(r"F:\antigravity project\Adsense\public\google08c3c147cd1db576.html")
            print("Downloaded verification file to public/google08c3c147cd1db576.html!")
