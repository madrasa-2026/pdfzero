import os
import zipfile
from pathlib import Path
from playwright.sync_api import sync_playwright

dist_dir = Path(r"F:\antigravity project\Adsense\dist")
zip_path = Path(r"F:\antigravity project\Adsense\dist.zip")

print("Re-zipping dist folder with google verification file...")
with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(dist_dir):
        for file in files:
            full_path = Path(root) / file
            rel_path = full_path.relative_to(dist_dir)
            zipf.write(full_path, rel_path)

print(f"Created {zip_path} ({zip_path.stat().st_size} bytes)")

with open(r'F:\OpenCode ANTI\Myquestionbank\web\playwright_session\DevToolsActivePort') as f:
    lines = [line.strip() for line in f]
ws_url = f'ws://127.0.0.1:{lines[0]}{lines[1]}'

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp(ws_url)
    context = browser.contexts[0]
    
    cf_page = None
    for page in context.pages:
        if 'pages/view/pdfzero' in page.url or 'pages' in page.url:
            cf_page = page
            break
            
    if cf_page:
        print("Clicking Create deployment...")
        cf_page.locator('text=Create deployment').first.click()
        cf_page.wait_for_timeout(3000)
        print("URL after clicking Create deployment:", cf_page.url)
        
        # Look for file input
        file_input = cf_page.locator('input[type="file"]').first
        print("Uploading updated dist.zip...")
        file_input.set_input_files(str(zip_path))
        cf_page.wait_for_timeout(5000)
        
        # Click Save and Deploy or Deploy site
        deploy_btn = cf_page.locator('button:has-text("Deploy"), button:has-text("Save and Deploy")').last
        print("Deploy button text:", deploy_btn.inner_text(), "enabled:", deploy_btn.is_enabled())
        if deploy_btn.is_enabled():
            deploy_btn.click()
            cf_page.wait_for_timeout(8000)
            print("Post-deploy URL:", cf_page.url)
            print("Finished redeployment!")
