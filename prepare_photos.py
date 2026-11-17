"""Generate private mobile-friendly derivatives without modifying source images.

Optional build dependency: pip install Pillow. Not required to serve the site.
"""

from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT.parent / "6months"
DESTINATION = ROOT / "private" / "photos" / "scrapbook"


def main() -> None:
    DESTINATION.mkdir(parents=True, exist_ok=True)
    for path in sorted(SOURCE.glob("*.jpg")):
        with Image.open(path) as original:
            image = ImageOps.exif_transpose(original).convert("RGB")
        if path.stem == "3":
            # This source is a sideways video still with black letterboxing.
            image = image.crop((0, 117, image.width, 1141)).rotate(-90, expand=True)
        image.thumbnail((1600, 1800), Image.Resampling.LANCZOS)
        image.save(DESTINATION / f"{path.stem}.webp", "WEBP", quality=92, method=6)
        image.thumbnail((480, 640), Image.Resampling.LANCZOS)
        image.save(DESTINATION / f"{path.stem}-thumb.webp", "WEBP", quality=83, method=6)
    total = sum(path.stat().st_size for path in DESTINATION.glob("*.webp"))
    print(f"Prepared {len(list(SOURCE.glob('*.jpg')))} photos; total derivatives {total / 1024:.0f} KB.")


if __name__ == "__main__":
    main()
