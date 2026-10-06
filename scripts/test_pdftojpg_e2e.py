import sys
import time
from playwright.sync_api import sync_playwright

def test_pdf_to_jpg():
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

        print("Navigating to http://localhost:4321/tools/pdf-to-jpg ...")
        page.goto("http://localhost:4321/tools/pdf-to-jpg", wait_until="networkidle")
        
        pdf_path = r"C:\Users\mehed\.gemini\antigravity\brain\5277aa9a-5ac1-4cf6-859c-befbd38b14a2\scratch\RotateTestDoc.pdf"
        print(f"Uploading file {pdf_path} ...")
        file_input = page.locator("#pdfimg-file-input")
        file_input.set_input_files(pdf_path)

        print("Waiting for settings section...")
        page.wait_for_selector("#pdfimg-settings-section:not(.hidden)", timeout=15000)
        
        page_count_text = page.locator("#pdfimg-page-count").inner_text()
        print(f"Detected page count: {page_count_text}")
        if "3" not in page_count_text:
            raise Exception(f"Expected 3 pages, found {page_count_text}")

        time.sleep(1)

        # Take screenshot of configuration state
        config_screenshot = r"C:\Users\mehed\.gemini\antigravity\brain\5277aa9a-5ac1-4cf6-859c-befbd38b14a2\pdf_to_jpg_config_state.png"
        page.screenshot(path=config_screenshot, full_page=True)
        print(f"Saved config screenshot to {config_screenshot}")

        # Click Convert to Images & Download
        print("Initiating conversion & download...")
        with page.expect_download(timeout=20000) as download_info:
            page.locator("#start-pdfimg-btn").click()
        
        download = download_info.value
        download_target = r"C:\Users\mehed\.gemini\antigravity\brain\5277aa9a-5ac1-4cf6-859c-befbd38b14a2\downloaded_images.zip"
        download.save_as(download_target)
        print(f"Downloaded converted ZIP to {download_target}")

        page.wait_for_selector("#pdfimg-success-section:not(.hidden)", timeout=10000)
        time.sleep(1)

        success_screenshot = r"C:\Users\mehed\.gemini\antigravity\brain\5277aa9a-5ac1-4cf6-859c-befbd38b14a2\pdf_to_jpg_success_state.png"
        page.screenshot(path=success_screenshot, full_page=True)
        print(f"Saved success screenshot to {success_screenshot}")

        browser.close()

    if errors:
        print(f"TEST FAILED: Console errors found ({len(errors)}): {errors}")
        sys.exit(1)
    else:
        print("PLAYWRIGHT PDF TO JPG TEST SUCCEEDED WITH 0 CONSOLE ERRORS!")

if __name__ == "__main__":
    test_pdf_to_jpg()
