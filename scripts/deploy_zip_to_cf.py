import os
import zipfile
from pathlib import Path
from playwright.sync_api import sync_playwright

dist_dir = Path(r"F:\antigravity project\Adsense\dist")
zip_path = Path(r"F:\antigravity project\Adsense\dist.zip")

print("Zipping dist folder...")
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
    
    target_page = None
    for page in context.pages:
        if 'pages/new/upload' in page.url:
            target_page = page
            break
            
    if target_page:
        print("Target page URL:", target_page.url)
        # Input 0 accepts .zip
        file_input = target_page.locator('input[type="file"]').first
        print("Uploading dist.zip to Cloudflare Pages...")
        file_input.set_input_files(str(zip_path))
        
        target_page.wait_for_timeout(5000)
        target_page.screenshot(path="after_zip_selected.png")
        
        main_text = target_page.get_by_role("main").nth(1).inner_text()
        print("Main text after zip upload:\n", main_text)
        
        # Check Deploy site button
        deploy_btn = target_page.locator('text=Deploy site')
        print("Deploy site enabled:", deploy_btn.is_enabled())
        if deploy_btn.is_enabled():
            print("Clicking 'Deploy site'...")
            deploy_btn.click()
            target_page.wait_for_timeout(10000)
            print("Current URL:", target_page.url)
            target_page.screenshot(path="after_deploy_click.png")
