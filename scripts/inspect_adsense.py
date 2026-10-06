from playwright.sync_api import sync_playwright

with open(r'F:\OpenCode ANTI\Myquestionbank\web\playwright_session\DevToolsActivePort') as f:
    lines = [line.strip() for line in f]
ws_url = f'ws://127.0.0.1:{lines[0]}{lines[1]}'

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp(ws_url)
    context = browser.contexts[0]
    
    adsense_page = None
    for page in context.pages:
        if 'adsense' in page.url:
            adsense_page = page
            break
            
    if adsense_page:
        print("AdSense Page URL:", adsense_page.url)
        print("AdSense Title:", adsense_page.title())
        with open('adsense_page.txt', 'w', encoding='utf-8') as f:
            f.write(adsense_page.locator('body').inner_text())
        print("Saved adsense_page.txt!")
        
        inputs = adsense_page.locator('input')
        for i in range(inputs.count()):
            inp = inputs.nth(i)
            print(f"Input {i}: aria-label={inp.get_attribute('aria-label')} placeholder={inp.get_attribute('placeholder')} type={inp.get_attribute('type')} value={inp.get_attribute('value')}")
