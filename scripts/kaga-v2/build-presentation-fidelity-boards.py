#!/usr/bin/env python3
"""Build the PF-1 source and before/after visual review boards."""

from pathlib import Path
import subprocess

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[2]
REPORT = ROOT / "reports" / "presentation-fidelity-gate1"
DETAIL = ROOT / "tmp" / "pdfs" / "presentation-fidelity" / "detail"
SOURCE_PDF = ROOT / "public" / "kaga" / "source" / "Rev06-King-Abdullah-Gardens-Inauguration.pdf"
BASELINE = ROOT / "reports" / "v2-final" / "screenshots"
IVORY = "#F3EBDD"
GREEN = "#07594F"
TEAL = "#3F9185"
GOLD = "#C6A25D"
ORANGE = "#E96C19"
INK = "#16221F"


def ensure_source_pages() -> None:
    DETAIL.mkdir(parents=True, exist_ok=True)
    for page in [3, 5, 7, 42, 64, 85, 99, 108, 111, 118, 126, 132]:
        output = DETAIL / f"page-{page:03d}.png"
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


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/HelveticaNeue.ttc",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size=size)
        except OSError:
            continue
    return ImageFont.load_default()


def cover(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    image = image.convert("RGB")
    scale = max(size[0] / image.width, size[1] / image.height)
    resized = image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.LANCZOS)
    left = (resized.width - size[0]) // 2
    top = (resized.height - size[1]) // 2
    return resized.crop((left, top, left + size[0], top + size[1]))


def labelled_pair(left_path: Path, right_path: Path, output: Path, left_label: str, right_label: str) -> None:
    width, height, band = 3840, 1080, 74
    canvas = Image.new("RGB", (width, height + band), IVORY)
    canvas.paste(cover(Image.open(left_path), (width // 2, height)), (0, band))
    canvas.paste(cover(Image.open(right_path), (width // 2, height)), (width // 2, band))
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 0, width // 2, band), fill=GREEN)
    draw.rectangle((width // 2, 0, width, band), fill=TEAL)
    draw.line((width // 2, 0, width // 2, height + band), fill=GOLD, width=2)
    label_font = font(27, bold=True)
    draw.text((32, 22), left_label, font=label_font, fill="#F8F3E9")
    draw.text((width // 2 + 32, 22), right_label, font=label_font, fill="#F8F3E9")
    canvas.save(output, optimize=True)


def source_dna_board() -> None:
    pages = [3, 5, 7, 42, 64, 85, 99, 108, 111, 118, 126, 132]
    labels = {
        3: "P03 — editorial split",
        5: "P05 — day chapter",
        7: "P07 — route map",
        42: "P42 — activation imagery",
        64: "P64 — quiet identity field",
        85: "P85 — contour frame",
        99: "P99 — render chapter",
        108: "P108 — organic system",
        111: "P111 — image / title ratio",
        118: "P118 — curve rhythm",
        126: "P126 — press environment",
        132: "P132 — closing aerial",
    }
    width, height = 3840, 2260
    canvas = Image.new("RGB", (width, height), IVORY)
    draw = ImageDraw.Draw(canvas)
    draw.text((90, 54), "KAGA PRESENTATION VISUAL DNA — 132-PAGE SOURCE AUDIT", font=font(44, True), fill=GREEN)
    draw.text((90, 116), "Composition · contour · quiet space · map hierarchy · image rhythm", font=font(24), fill=INK)
    swatches = [(GREEN, "GREEN"), (TEAL, "TEAL"), (GOLD, "GOLD"), (ORANGE, "ACTIVE"), (IVORY, "IVORY")]
    x = 2470
    for color, label in swatches:
        draw.rounded_rectangle((x, 62, x + 190, 126), radius=8, fill=color, outline="#C9BDAC")
        draw.text((x + 10, 136), label, font=font(16, True), fill=INK)
        x += 235

    tile_w, tile_h = 900, 506
    x_gap, y_gap = 36, 36
    start_x, start_y = 84, 205
    for index, page in enumerate(pages):
        row, col = divmod(index, 4)
        x = start_x + col * (tile_w + x_gap)
        y = start_y + row * (tile_h + 104 + y_gap)
        image_path = DETAIL / f"page-{page:03d}.png"
        canvas.paste(cover(Image.open(image_path), (tile_w, tile_h)), (x, y))
        draw.rectangle((x, y + tile_h, x + tile_w, y + tile_h + 72), fill="#F8F3E9")
        draw.line((x, y + tile_h, x + 190, y + tile_h), fill=GOLD, width=3)
        draw.text((x + 12, y + tile_h + 20), labels[page], font=font(20, True), fill=GREEN)
    canvas.save(REPORT / "01-source-dna-board.png", optimize=True)


def main() -> None:
    REPORT.mkdir(parents=True, exist_ok=True)
    ensure_source_pages()
    source_dna_board()

    labelled_pair(DETAIL / "page-003.png", REPORT / "02-intro-v21-1920.png", REPORT / "08-intro-source-vs-v21.png", "SOURCE PDF · page 03", "KAGA V2.1 · Intro")
    labelled_pair(DETAIL / "page-005.png", REPORT / "04-four-days-v21-1920.png", REPORT / "09-four-days-source-vs-v21.png", "SOURCE PDF · day chapter", "KAGA V2.1 · Four Days")
    labelled_pair(DETAIL / "page-007.png", REPORT / "06-masterplan-v21-1920.png", REPORT / "10-masterplan-source-vs-v21.png", "SOURCE PDF · route map", "KAGA V2.1 · Masterplan")

    labelled_pair(BASELINE / "01-intro.png", REPORT / "02-intro-v21-1920.png", REPORT / "11-v2-vs-v21-intro.png", "APPROVED V2", "V2.1 PRESENTATION FIDELITY")
    labelled_pair(BASELINE / "03-four-days.png", REPORT / "04-four-days-v21-1920.png", REPORT / "12-v2-vs-v21-four-days.png", "APPROVED V2", "V2.1 PRESENTATION FIDELITY")
    labelled_pair(BASELINE / "04-masterplan.png", REPORT / "06-masterplan-v21-1920.png", REPORT / "13-v2-vs-v21-masterplan.png", "APPROVED V2", "V2.1 PRESENTATION FIDELITY")


if __name__ == "__main__":
    main()
