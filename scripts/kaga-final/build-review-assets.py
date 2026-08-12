from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
REPORT = ROOT / "reports" / "kaga-final"


def contact_sheet() -> None:
    sources = sorted((REPORT / "1920x1080").glob("*.png"))
    columns = 4
    cell_width, image_height, label_height, gap = 468, 263, 26, 10
    rows = (len(sources) + columns - 1) // columns
    canvas = Image.new("RGB", (columns * cell_width + (columns + 1) * gap, rows * (image_height + label_height) + (rows + 1) * gap), "#f5f0e4")
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.load_default(size=14)
    for index, source in enumerate(sources):
        image = Image.open(source).convert("RGB")
        image.thumbnail((cell_width, image_height), Image.Resampling.LANCZOS)
        x = gap + (index % columns) * (cell_width + gap)
        y = gap + (index // columns) * (image_height + label_height + gap)
        canvas.paste(image, (x, y))
        draw.text((x, y + image_height + 5), source.stem, fill="#173c34", font=font)
    canvas.save(REPORT / "KAGA-FINAL-CONTACT-SHEET.png", optimize=True)


def living_days_board() -> None:
    sources = [REPORT / "1920x1080" / f"10-living-day-{index}.png" for index in range(1, 5)]
    board = Image.new("RGB", (1920, 1080), "#f5f0e4")
    for index, source in enumerate(sources):
        image = Image.open(source).convert("RGB").resize((960, 540), Image.Resampling.LANCZOS)
        board.paste(image, ((index % 2) * 960, (index // 2) * 540))
    board.save(REPORT / "KAGA-FINAL-LIVING-FOUR-DAY-PROOF.png", optimize=True)


def illustrated_proof() -> None:
    source = REPORT / "1920x1080" / "06-place-lens-illustrated.png"
    Image.open(source).save(REPORT / "KAGA-FINAL-ILLUSTRATED-MAP-PROOF.png", optimize=True)


if __name__ == "__main__":
    contact_sheet()
    living_days_board()
    illustrated_proof()
