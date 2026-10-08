import os
from playwright.sync_api import sync_playwright

os.makedirs('public', exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch()
    
    # 1. Render App Icons (192, 512, 180)
    for size, name in [(192, 'icon-192.png'), (512, 'icon-512.png'), (180, 'apple-touch-icon.png')]:
        page = browser.new_page(viewport={'width': size, 'height': size})
        icon_html = f'''<!DOCTYPE html>
<html>
<head><style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{ width: {size}px; height: {size}px; background: #090a0f; display: flex; align-items: center; justify-content: center; }}
  .card {{ width: {int(size*0.8)}px; height: {int(size*0.8)}px; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); border-radius: {int(size*0.22)}px; display: flex; align-items: center; justify-content: center; box-shadow: 0 {int(size*0.08)}px {int(size*0.16)}px rgba(0,0,0,0.5); }}
  svg {{ width: {int(size*0.48)}px; height: {int(size*0.48)}px; color: white; }}
</style></head>
<body>
  <div class="card">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="rgba(255,255,255,0.15)" stroke="#ffffff"></path>
      <polyline points="14 2 14 8 20 8" fill="#ffffff" stroke="#ffffff"></polyline>
      <path d="M9 13h6" stroke="#ffffff" stroke-width="2.5"></path>
      <path d="M9 17h4" stroke="#ffffff" stroke-width="2.5"></path>
    </svg>
  </div>
</body>
</html>'''
        page.set_content(icon_html)
        page.screenshot(path=f'public/{name}')
        page.close()
        print(f'Generated public/{name}')

    # 2. Render 1200x630 OpenGraph Banner
    og_page = browser.new_page(viewport={'width': 1200, 'height': 630})
    og_html = '''<!DOCTYPE html>
<html>
<head>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Inter', -apple-system, sans-serif; }
  body {
    width: 1200px;
    height: 630px;
    background: #090a0f;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 70px 80px;
    position: relative;
    overflow: hidden;
  }
  .glow-1 {
    position: absolute;
    top: -150px;
    right: -100px;
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(37, 99, 235, 0.22) 0%, rgba(37, 99, 235, 0) 70%);
    border-radius: 50%;
  }
  .glow-2 {
    position: absolute;
    bottom: -150px;
    left: -100px;
    width: 500px;
    height: 500px;
    background: radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0) 70%);
    border-radius: 50%;
  }
  .grid-pattern {
    position: absolute;
    inset: 0;
    background-image: linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
    background-size: 40px 40px;
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: relative;
    z-index: 10;
  }
  .logo-group {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .logo-box {
    width: 54px;
    height: 54px;
    background: #2563eb;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 24px rgba(37, 99, 235, 0.4);
  }
  .logo-box svg {
    width: 32px;
    height: 32px;
    color: white;
  }
  .logo-text {
    font-size: 36px;
    font-weight: 800;
    letter-spacing: -0.04em;
    color: white;
  }
  .logo-text span {
    color: #60a5fa;
  }
  .badge-adfree {
    background: rgba(16, 185, 129, 0.12);
    border: 1px solid rgba(16, 185, 129, 0.3);
    color: #34d399;
    padding: 8px 18px;
    border-radius: 999px;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 0.02em;
  }
  .hero {
    position: relative;
    z-index: 10;
    margin: 20px 0;
  }
  .pill-tag {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #94a3b8;
    padding: 6px 14px;
    border-radius: 999px;
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 20px;
  }
  .pill-dot {
    width: 8px;
    height: 8px;
    background: #10b981;
    border-radius: 50%;
  }
  .headline {
    font-size: 58px;
    font-weight: 900;
    letter-spacing: -0.04em;
    line-height: 1.15;
    color: #ffffff;
    margin-bottom: 18px;
  }
  .headline span {
    background: linear-gradient(135deg, #60a5fa 0%, #38bdf8 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .subheadline {
    font-size: 22px;
    color: #94a3b8;
    line-height: 1.45;
    max-width: 950px;
  }
  .footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: relative;
    z-index: 10;
    padding-top: 24px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }
  .features {
    display: flex;
    gap: 28px;
  }
  .feat-item {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #cbd5e1;
    font-size: 16px;
    font-weight: 600;
  }
  .feat-check {
    color: #34d399;
    font-weight: 800;
  }
  .domain-tag {
    color: #64748b;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }
</style>
</head>
<body>
  <div class="glow-1"></div>
  <div class="glow-2"></div>
  <div class="grid-pattern"></div>

  <div class="header">
    <div class="logo-group">
      <div class="logo-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="rgba(255,255,255,0.15)" stroke="#ffffff"></path>
          <polyline points="14 2 14 8 20 8" fill="#ffffff" stroke="#ffffff"></polyline>
          <path d="M9 13h6" stroke="#ffffff" stroke-width="2.5"></path>
          <path d="M9 17h4" stroke="#ffffff" stroke-width="2.5"></path>
        </svg>
      </div>
      <div class="logo-text">Air<span>PDF</span></div>
    </div>
    <div class="badge-adfree">100% Ad-Free</div>
  </div>

  <div class="hero">
    <div class="pill-tag">
      <div class="pill-dot"></div>
      100% In-Browser Engine · Zero Server Uploads · Air-Gapped Privacy
    </div>
    <div class="headline">
      Fast, Private PDF Tools.<br>
      <span>Zero Uploads. Zero Ads.</span>
    </div>
    <div class="subheadline">
      Merge, Compress, Split, Convert, Encrypt, and Sign documents locally on your device. Never waits in queues. Works completely offline.
    </div>
  </div>

  <div class="footer">
    <div class="features">
      <div class="feat-item"><span class="feat-check">✓</span> 10 Free Tools</div>
      <div class="feat-item"><span class="feat-check">✓</span> WebAssembly Speed</div>
      <div class="feat-item"><span class="feat-check">✓</span> No Signup Required</div>
      <div class="feat-item"><span class="feat-check">✓</span> GDPR & Confidentiality Safe</div>
    </div>
    <div class="domain-tag">airpdf.pages.dev</div>
  </div>
</body>
</html>'''
    og_page.set_content(og_html)
    og_page.wait_for_timeout(1000)
    og_page.screenshot(path='public/og-image.png')
    og_page.close()
    print('Generated public/og-image.png (1200x630)')

    browser.close()
