#!/usr/bin/env python3
"""Build PF-1.1 source, PF-1 and corrected visual comparison boards."""

from pathlib import Path
import subprocess

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[2]
REPORT = ROOT / "reports" / "presentation-fidelity-gate1-1"
SOURCE = ROOT / "tmp" / "pdfs" / "presentation-fidelity" / "detail"
SOURCE_PDF = ROOT / "public" / "kaga" / "source" / "Rev06-King-Abdullah-Gardens-Inauguration.pdf"
PF1 = ROOT / "reports" / "presentation-fidelity-gate1"
IVORY = "#F3EBDD"
GREEN = "#07594F"
TEAL = "#3F9185"
GOLD = "#C6A25D"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/HelveticaNeue.ttc",
    ]
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size=size)
        except OSError:
            continue
    return ImageFont.load_default()


def ensure_source_pages() -> None:
    SOURCE.mkdir(parents=True, exist_ok=True)
    for page in (3, 5, 7):
        output = SOURCE / f"page-{page:03d}.png"
        if output.exists():
            continue
        subprocess.run(
            [
                "pdftoppm",
                "-f", str(page),
                "-singlefile",
                "-png",
                "-r", "144",
                str(SOURCE_PDF),
                str(output.with_suffix("")),
            ],
            check=True,
        )


def cover(path: Path, size: tuple[int, int]) -> Image.Image:
    image = Image.open(path).convert("RGB")
    scale = max(size[0] / image.width, size[1] / image.height)
    resized = image.resize(
        (round(image.width * scale), round(image.height * scale)),
        Image.Resampling.LANCZOS,
    )
    left = (resized.width - size[0]) // 2
    top = (resized.height - size[1]) // 2
    return resized.crop((left, top, left + size[0], top + size[1]))


def comparison(paths: list[Path], labels: list[str], output: Path) -> None:
    panel_width, panel_height, band = 1920, 1080, 74
    width = panel_width * len(paths)
    canvas = Image.new("RGB", (width, panel_height + band), IVORY)
    draw = ImageDraw.Draw(canvas)
    colors = [GREEN, TEAL, "#51766F"]
    label_font = font(27, bold=True)

    for index, (path, label) in enumerate(zip(paths, labels, strict=True)):
        x = index * panel_width
        canvas.paste(cover(path, (panel_width, panel_height)), (x, band))
        draw.rectangle((x, 0, x + panel_width, band), fill=colors[index])
        draw.text((x + 32, 22), label, font=label_font, fill="#F8F3E9")
        if index:
            draw.line((x, 0, x, panel_height + band), fill=GOLD, width=2)

    canvas.save(output, optimize=True)


def main() -> None:
    REPORT.mkdir(parents=True, exist_ok=True)
    ensure_source_pages()
    source_pages = {
        "intro": SOURCE / "page-003.png",
        "days": SOURCE / "page-005.png",
        "map": SOURCE / "page-007.png",
    }
    refined = {
        "intro": REPORT / "01-intro-refined-1920.png",
        "days": REPORT / "02-four-days-refined-1920.png",
        "map": REPORT / "03-masterplan-refined-1920.png",
    }
    pf1 = {
        "intro": PF1 / "02-intro-v21-1920.png",
        "days": PF1 / "04-four-days-v21-1920.png",
        "map": PF1 / "06-masterplan-v21-1920.png",
    }

    comparison([source_pages["intro"], refined["intro"]], ["SOURCE PDF · EDITORIAL", "PF-1.1 · INTRO"], REPORT / "07-intro-source-vs-refined.png")
    comparison([source_pages["days"], refined["days"]], ["SOURCE PDF · EVENT DAY", "PF-1.1 · FOUR DAYS"], REPORT / "08-four-days-source-vs-refined.png")
    comparison([source_pages["map"], refined["map"]], ["SOURCE PDF · ROUTE MAP", "PF-1.1 · MASTERPLAN"], REPORT / "09-masterplan-source-vs-refined.png")

    comparison([pf1["intro"], refined["intro"]], ["PF-1", "PF-1.1 · REFINED"], REPORT / "10-pf1-vs-pf11-intro.png")
    comparison([pf1["days"], refined["days"]], ["PF-1", "PF-1.1 · REFINED"], REPORT / "11-pf1-vs-pf11-four-days.png")
    comparison([pf1["map"], refined["map"]], ["PF-1", "PF-1.1 · ROUTE/MAP"], REPORT / "12-pf1-vs-pf11-masterplan.png")
    comparison(
        [source_pages["map"], pf1["map"], refined["map"]],
        ["SOURCE PDF · ROUTE MAP", "PF-1 · OVER-GENERALISED", "PF-1.1 · CORRECTED"],
        REPORT / "13-masterplan-source-pf1-pf11.png",
    )


if __name__ == "__main__":
    main()
