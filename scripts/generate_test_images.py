import os
from PIL import Image, ImageDraw

def create_sample_images():
    scratch_dir = r"C:\Users\mehed\.gemini\antigravity\brain\5277aa9a-5ac1-4cf6-859c-befbd38b14a2\scratch"
    os.makedirs(scratch_dir, exist_ok=True)

    # Image 1 (JPG, Blue box with text)
    img1 = Image.new("RGB", (600, 400), color=(59, 130, 246))
    draw1 = ImageDraw.Draw(img1)
    draw1.rectangle([50, 50, 550, 350], outline=(255, 255, 255), width=4)
    img1_path = os.path.join(scratch_dir, "sample_photo1.jpg")
    img1.save(img1_path, "JPEG", quality=90)
    print("Saved sample image 1 to:", img1_path)

    # Image 2 (PNG, Emerald box with circle)
    img2 = Image.new("RGB", (500, 700), color=(16, 185, 129))
    draw2 = ImageDraw.Draw(img2)
    draw2.ellipse([100, 200, 400, 500], fill=(255, 255, 255))
    img2_path = os.path.join(scratch_dir, "sample_photo2.png")
    img2.save(img2_path, "PNG")
    print("Saved sample image 2 to:", img2_path)

if __name__ == "__main__":
    create_sample_images()
