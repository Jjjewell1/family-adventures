#!/usr/bin/env python3
"""
Optimize an uploaded image for the web:
  1. Apply EXIF orientation (straighten phone photos).
  2. Downscale to a max dimension (default 1600px) preserving aspect ratio.
  3. Re-encode:
       - opaque images  -> high-quality JPEG  (best size for photos)
       - images with alpha -> optimized PNG    (keep transparency)
  4. Write the result to <output_base>.<ext> and print the final filename.

If the image cannot be read (e.g. HEIC/HEIF without a decode plugin), it is
left as-is: this script prints "SKIP" and exits with code 3 so callers can
keep the original file.

Usage: python optimize-image.py <input_path> <output_base> [max_dim] [quality]
  e.g. python optimize-image.py /tmp/photo.heic /app/build/client/uploads/thumb-1721952000000 1600 82
"""
import sys
from pathlib import Path


def main():
    if len(sys.argv) < 3:
        print("Usage: optimize-image.py <input_path> <output_base> [max_dim] [quality]")
        sys.exit(1)

    input_path = Path(sys.argv[1])
    output_base = Path(sys.argv[2])
    max_dim = int(sys.argv[3]) if len(sys.argv) > 3 and sys.argv[3] else 1600
    quality = int(sys.argv[4]) if len(sys.argv) > 4 and sys.argv[4] else 82

    if not input_path.exists():
        print("SKIP")
        sys.exit(3)

    try:
        from PIL import Image, ImageOps

        with Image.open(input_path) as img:
            # Straighten photos that carry EXIF rotation (common for phone uploads)
            img = ImageOps.exif_transpose(img)

            # Downscale to max dimension, preserving aspect ratio
            if max(img.size) > max_dim:
                img.thumbnail((max_dim, max_dim), Image.LANCZOS)

            has_alpha = img.mode in ("RGBA", "LA") or (
                img.mode == "P" and "transparency" in img.info
            )

            if has_alpha:
                rgba = img.convert("RGBA")
                out = Path(str(output_base) + ".png")
                rgba.save(out, "PNG", optimize=True)
                final = out.name
            else:
                rgb = img.convert("RGB")
                out = Path(str(output_base) + ".jpg")
                rgb.save(out, "JPEG", quality=quality, optimize=True)
                final = out.name

        print(final)
        return 0

    except Exception as e:
        # Unreadable format (e.g. HEIC without the HEIF plugin) -> keep original
        print(f"SKIP: {e}", file=sys.stderr)
        print("SKIP")
        sys.exit(3)


if __name__ == "__main__":
    sys.exit(main() or 0)
