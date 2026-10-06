import sys
import time
from playwright.sync_api import sync_playwright

def test_rotate():
    errors = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(accept_downloads=True)
        page = context.new_page()

        def handle_console(msg):
            if msg.type == "error":
                print(f"[CONSOLE ERROR]: {msg.text}")
                errors.append(msg.text)
            else:
                print(f"[CONSOLE {msg.type.upper()}]: {msg.text}")

        page.on("console", handle_console)
        page.on("pageerror", lambda err: errors.append(str(err)))

        print("Navigating to http://localhost:4321/tools/rotate-pdf ...")
        page.goto("http://localhost:4321/tools/rotate-pdf", wait_until="networkidle")
        
        pdf_path = r"C:\Users\mehed\.gemini\antigravity\brain\5277aa9a-5ac1-4cf6-859c-befbd38b14a2\scratch\RotateTestDoc.pdf"
        print(f"Uploading file {pdf_path} ...")
        file_input = page.locator("#rotate-file-input")
        file_input.set_input_files(pdf_path)

        print("Waiting for page thumbnails to render...")
        page.wait_for_selector("#pages-grid:not(.hidden)", timeout=15000)
        page.wait_for_selector(".page-card", timeout=15000)
        
        cards = page.locator(".page-card")
        count = cards.count()
        print(f"Found {count} page thumbnail cards.")
        if count != 3:
            raise Exception(f"Expected 3 page cards, found {count}")

        # Page 1: click rotate right once -> 90deg
        print("Rotating page 1 right (+90°)...")
        card1 = cards.nth(0)
        card1.locator(".rot-right-btn").click()
        time.sleep(0.5)

        # Page 2: click rotate right twice -> 180deg
        print("Rotating page 2 right twice (+180°)...")
        card2 = cards.nth(1)
        card2.locator(".rot-right-btn").click()
        time.sleep(0.3)
        card2.locator(".rot-right-btn").click()
        time.sleep(0.5)

        # Take screenshot of configuration
        config_screenshot = r"C:\Users\mehed\.gemini\antigravity\brain\5277aa9a-5ac1-4cf6-859c-befbd38b14a2\rotate_config_state.png"
        page.screenshot(path=config_screenshot, full_page=True)
        print(f"Saved config screenshot to {config_screenshot}")

        # Click Save & Download Rotated PDF
        print("Initiating rotation & download...")
        with page.expect_download(timeout=20000) as download_info:
            page.locator("#start-rotate-btn").click()
        
        download = download_info.value
        download_target = r"C:\Users\mehed\.gemini\antigravity\brain\5277aa9a-5ac1-4cf6-859c-befbd38b14a2\downloaded_rotated.pdf"
        download.save_as(download_target)
        print(f"Downloaded rotated PDF to {download_target}")

        page.wait_for_selector("#rotate-success-section:not(.hidden)", timeout=10000)
        time.sleep(1)

        success_screenshot = r"C:\Users\mehed\.gemini\antigravity\brain\5277aa9a-5ac1-4cf6-859c-befbd38b14a2\rotate_success_state.png"
        page.screenshot(path=success_screenshot, full_page=True)
        print(f"Saved success screenshot to {success_screenshot}")

        browser.close()

    if errors:
        print(f"TEST FAILED: Console errors found ({len(errors)}): {errors}")
        sys.exit(1)
    else:
        print("PLAYWRIGHT ROTATE TEST SUCCEEDED WITH 0 CONSOLE ERRORS!")

if __name__ == "__main__":
    test_rotate()
