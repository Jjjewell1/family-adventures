#!/usr/bin/env python3
"""
Process uploaded logo:
  1. Remove white/near-white background → transparent PNG
  2. Generate logo.png (512x512) for nav/footer
  3. Generate favicon.png (64x64) for browser tab
  4. Generate og-image.png (1200x630) with logo centered on gradient background

Usage: python process-logo.py <input_path> <static_dir>
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import math

def remove_background(img, threshold=235):
    """Remove white/near-white background by making those pixels transparent."""
    img = img.convert("RGBA")
    pixels = img.load()
    w, h = img.size

    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            # If pixel is close to white (all channels above threshold), make transparent
            if r >= threshold and g >= threshold and b >= threshold:
                pixels[x, y] = (r, g, b, 0)
            # Also handle very light gray backgrounds
            elif r >= 220 and g >= 220 and b >= 220:
                # Calculate distance from pure white
                dist = math.sqrt((255-r)**2 + (255-g)**2 + (255-b)**2)
                if dist < 60:
                    pixels[x, y] = (r, g, b, 0)

    return img


def trim_transparency(img):
    """Trim transparent edges to get tight bounding box."""
    bbox = img.getbbox()
    if bbox:
        return img.crop(bbox)
    return img


def make_square(img, size, padding_pct=0.1):
    """Make image square and resize, with optional padding."""
    w, h = img.size
    max_dim = max(w, h)
    padding = int(max_dim * padding_pct)
    canvas_size = max_dim + padding * 2

    # Create transparent canvas
    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    # Center the image
    x = (canvas_size - w) // 2
    y = (canvas_size - h) // 2
    canvas.paste(img, (x, y), img if img.mode == "RGBA" else None)

    return canvas.resize((size, size), Image.LANCZOS)


def create_og_image(logo_path, output_path, width=1200, height=630):
    """Create an OG image: logo centered on a nice gradient background."""
    # Create gradient background (dark navy to ocean teal)
    img = Image.new("RGB", (width, height))
    draw = ImageDraw.Draw(img)

    for y in range(height):
        ratio = y / height
        r = int(6 + ratio * 8)    # 6 → 14
        g = int(10 + ratio * 114) # 10 → 124
        b = int(16 + ratio * 107) # 16 → 123
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    # Add subtle decorative elements
    # Sun glow (top right)
    for i in range(80, 0, -1):
        alpha_ratio = i / 80
        sun_r = int(255 * (1 - alpha_ratio * 0.3))
        sun_g = int(180 * (1 - alpha_ratio * 0.4))
        sun_b = int(100 * (1 - alpha_ratio * 0.5))
        glow_size = int(i * 3)
        cx, cy = width - 180, 120
        draw.ellipse(
            [cx - glow_size, cy - glow_size, cx + glow_size, cy + glow_size],
            fill=(sun_r, sun_g, sun_b)
        )

    # Load and paste logo centered
    try:
        logo = Image.open(logo_path).convert("RGBA")
        # Resize logo to fit nicely (about 40% of height)
        logo_size = int(height * 0.4)
        logo = logo.resize((logo_size, logo_size), Image.LANCZOS)
        lx = (width - logo_size) // 2
        ly = (height - logo_size) // 2 - 30  # slightly above center
        img.paste(logo, (lx, ly), logo)
    except Exception:
        pass  # If logo fails, just use the gradient

    # Add site name text below logo
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 36)
        small_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 20)
    except (OSError, IOError):
        font = ImageFont.load_default()
        small_font = font

    # Title
    title = "Family Adventures"
    bbox = draw.textbbox((0, 0), title, font=font)
    tw = bbox[2] - bbox[0]
    draw.text(((width - tw) // 2, height - 120), title, fill=(255, 255, 255), font=font)

    # Subtitle
    subtitle = "Our collection of memories and shared moments"
    bbox2 = draw.textbbox((0, 0), subtitle, font=small_font)
    sw = bbox2[2] - bbox2[0]
    draw.text(((width - sw) // 2, height - 70), subtitle, fill=(180, 200, 210), font=small_font)

    img.save(output_path, "PNG", quality=95)


def main():
    if len(sys.argv) < 3:
        print("Usage: python process-logo.py <input_path> <static_dir>")
        sys.exit(1)

    input_path = Path(sys.argv[1])
    static_dir = Path(sys.argv[2])

    if not input_path.exists():
        print(f"Error: {input_path} not found")
        sys.exit(1)

    static_dir.mkdir(parents=True, exist_ok=True)

    # Load and process
    img = Image.open(input_path)
    print(f"Input: {img.size[0]}x{img.size[1]}, mode={img.mode}")

    # Remove background
    processed = remove_background(img)
    processed = trim_transparency(processed)
    print(f"After background removal: {processed.size[0]}x{processed.size[1]}")

    # Generate logo.png (512x512 with padding)
    logo = make_square(processed, 512, padding_pct=0.08)
    logo_path = static_dir / "logo.png"
    logo.save(logo_path, "PNG")
    print(f"Saved logo: {logo_path} ({logo.size[0]}x{logo.size[1]})")

    # Generate favicon.png (64x64 tight, no padding)
    favicon = make_square(processed, 64, padding_pct=0.05)
    favicon_path = static_dir / "favicon.png"
    favicon.save(favicon_path, "PNG")
    print(f"Saved favicon: {favicon_path} ({favicon.size[0]}x{favicon.size[1]})")

    # Generate og-image.png (1200x630)
    og_path = static_dir / "og-image.png"
    create_og_image(logo_path, og_path)
    print(f"Saved OG image: {og_path}")

    print("Done!")
    return 0


if __name__ == "__main__":
    sys.exit(main() or 0)
