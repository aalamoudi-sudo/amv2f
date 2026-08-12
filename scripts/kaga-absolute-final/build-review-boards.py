#!/usr/bin/env python3
"""Build deterministic KAGA Absolute Final review boards."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[2]
REPORT = ROOT / "reports" / "kaga-absolute-final"
IVORY = "#f3ede5"
GREEN = "#0d5350"
GOLD = "#b99a5b"


def font(size: int, bold: bool = False):
    candidate = Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf")
    return ImageFont.truetype(str(candidate), size=size) if candidate.exists() else ImageFont.load_default()


def fit(path: Path, size: tuple[int, int], focus=(0.5, 0.5)) -> Image.Image:
    return ImageOps.fit(Image.open(path).convert("RGB"), size, Image.Resampling.LANCZOS, centering=focus)


def heading(draw: ImageDraw.ImageDraw, text: str, y: int = 52):
    draw.text((110, y), text, fill=GREEN, font=font(48, True))
    draw.line((110, y + 72, 3730, y + 72), fill=GOLD, width=2)


def build_place_truth() -> None:
    canvas = Image.new("RGB", (3840, 2160), IVORY)
    draw = ImageDraw.Draw(canvas)
    heading(draw, "KAGA FINAL — PLACE SOURCE TRUTH")
    panels = [
        (ROOT / "public/kaga/assets/core/guests-masterplan-p026.webp", "EVENT PROPOSAL — NAME / JOURNEY"),
        (REPORT / "09-final-place-truth-map.png", "RHINO — PHYSICAL TRUTH"),
        (ROOT / "reports/kaga-final-place-truth/02-disney-map-canonical-labels.png", "ILLUSTRATOR — VISUAL READING"),
        (REPORT / "10-final-garden-explorer.png", "KNOWLEDGE — EXPLICIT ENRICHMENT"),
    ]
    positions = [(110, 190), (1980, 190), (110, 1120), (1980, 1120)]
    for (path, title), (x, y) in zip(panels, positions):
        canvas.paste(fit(path, (1750, 790)), (x, y))
        draw.text((x, y + 810), title, fill=GREEN, font=font(25, True))
    canvas.save(REPORT / "KAGA-FINAL-PLACE-SOURCE-TRUTH.png", quality=95)


def build_guest_truth() -> None:
    canvas = Image.new("RGB", (3840, 2160), IVORY)
    draw = ImageDraw.Draw(canvas)
    heading(draw, "KAGA FINAL — GUEST JOURNEY PAGE 26 TRUTH")
    canvas.paste(fit(ROOT / "public/kaga/assets/core/guests-masterplan-p026.webp", (1740, 1730)), (110, 190))
    canvas.paste(fit(REPORT / "03-final-guest-overview.png", (1740, 825)), (1990, 190))
    canvas.paste(fit(REPORT / "05-final-stop-C.png", (1740, 825)), (1990, 1095))
    draw.line((1920, 190, 1920, 1920), fill=GOLD, width=2)
    draw.text((110, 1975), "SOURCE PAGE 26 — A TO L / 05:30 PM TO 07:30 PM", fill=GREEN, font=font(25, True))
    draw.text((1990, 1975), "LIVE KAGA — SAME ROUTE / SAME STOP C / SAME 60 MINUTES", fill=GREEN, font=font(25, True))
    canvas.save(REPORT / "KAGA-FINAL-GUEST-PAGE26-TRUTH.png", quality=95)


def build_contact_sheet() -> None:
    paths = [REPORT / f"{index:02d}-{name}.png" for index, name in [
        (1, "final-opening-1920"), (2, "final-opening-2560"), (3, "final-guest-overview"),
        (4, "final-guest-playing"), (5, "final-stop-C"), (6, "final-map-experience"),
        (7, "final-xray"), (8, "final-return"), (9, "final-place-truth-map"),
        (10, "final-garden-explorer"), (11, "final-living-day-map"), (12, "final-global-director"),
        (13, "final-visual-museum"), (14, "final-presenter"),
    ]]
    canvas = Image.new("RGB", (3840, 2160), IVORY)
    draw = ImageDraw.Draw(canvas)
    heading(draw, "KAGA ABSOLUTE FINAL — COMPLETE EXPERIENCE")
    cell_w, cell_h = 880, 430
    for index, path in enumerate(paths):
        row, column = divmod(index, 4)
        x, y = 110 + column * 930, 170 + row * 500
        canvas.paste(fit(path, (cell_w, cell_h)), (x, y))
        draw.text((x, y + 440), path.stem, fill=GREEN, font=font(19, True))
    canvas.save(REPORT / "KAGA-ABSOLUTE-FINAL-CONTACT-SHEET.png", quality=95)


if __name__ == "__main__":
    REPORT.mkdir(parents=True, exist_ok=True)
    build_place_truth()
    build_guest_truth()
    build_contact_sheet()
