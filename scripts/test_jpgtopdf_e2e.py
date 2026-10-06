import sys
import time
from playwright.sync_api import sync_playwright

def test_jpg_to_pdf():
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

        print("Navigating to http://localhost:4321/tools/jpg-to-pdf ...")
        page.goto("http://localhost:4321/tools/jpg-to-pdf", wait_until="networkidle")
        
        img1 = r"C:\Users\mehed\.gemini\antigravity\brain\5277aa9a-5ac1-4cf6-859c-befbd38b14a2\scratch\sample_photo1.jpg"
        img2 = r"C:\Users\mehed\.gemini\antigravity\brain\5277aa9a-5ac1-4cf6-859c-befbd38b14a2\scratch\sample_photo2.png"

        print(f"Uploading files {img1} and {img2} ...")
        file_input = page.locator("#img-file-input")
        file_input.set_input_files([img1, img2])

        print("Waiting for settings section and queue...")
        page.wait_for_selector("#img-settings-section:not(.hidden)", timeout=15000)
        page.wait_for_selector(".img-item", timeout=15000)
        
        items = page.locator(".img-item")
        count = items.count()
        print(f"Queue count: {count}")
        if count != 2:
            raise Exception(f"Expected 2 queue items, got {count}")

        # Test reordering: move down on first item
        print("Reordering queue items...")
        items.nth(0).locator(".move-down-btn").click()
        time.sleep(0.5)

        # Take screenshot of queue state
        queue_screenshot = r"C:\Users\mehed\.gemini\antigravity\brain\5277aa9a-5ac1-4cf6-859c-befbd38b14a2\jpg_to_pdf_queue_state.png"
        page.screenshot(path=queue_screenshot, full_page=True)
        print(f"Saved queue screenshot to {queue_screenshot}")

        # Click Convert to PDF & Download
        print("Initiating conversion & download...")
        with page.expect_download(timeout=20000) as download_info:
            page.locator("#start-img-btn").click()
        
        download = download_info.value
        download_target = r"C:\Users\mehed\.gemini\antigravity\brain\5277aa9a-5ac1-4cf6-859c-befbd38b14a2\downloaded_images.pdf"
        download.save_as(download_target)
        print(f"Downloaded converted PDF to {download_target}")

        page.wait_for_selector("#img-success-section:not(.hidden)", timeout=10000)
        time.sleep(1)

        success_screenshot = r"C:\Users\mehed\.gemini\antigravity\brain\5277aa9a-5ac1-4cf6-859c-befbd38b14a2\jpg_to_pdf_success_state.png"
        page.screenshot(path=success_screenshot, full_page=True)
        print(f"Saved success screenshot to {success_screenshot}")

        browser.close()

    if errors:
        print(f"TEST FAILED: Console errors found ({len(errors)}): {errors}")
        sys.exit(1)
    else:
        print("PLAYWRIGHT JPG TO PDF TEST SUCCEEDED WITH 0 CONSOLE ERRORS!")

if __name__ == "__main__":
    test_jpg_to_pdf()
