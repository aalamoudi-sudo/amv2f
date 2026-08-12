#!/usr/bin/env python3
"""Build deterministic Gate M1 review boards from captured runtime frames."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[2]
REPORT = ROOT / "reports" / "illustrated-map-gate1"
ASSETS = ROOT / "public" / "kaga" / "illustrated-map"
IVORY = (245, 240, 228, 255)
GREEN = (13, 81, 72, 255)


def font(size: int):
    for candidate in [
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
    ]:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


def fit(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    result = image.copy()
    result.thumbnail(size, Image.Resampling.LANCZOS)
    return result


def before_after() -> None:
    canvas = Image.new("RGB", (2560, 820), IVORY[:3])
    draw = ImageDraw.Draw(canvas)
    left = fit(Image.open(REPORT / "01-source-true-masterplan.png").convert("RGB"), (1240, 700))
    right = fit(Image.open(REPORT / "02-illustrated-map.png").convert("RGB"), (1240, 700))
    canvas.paste(left, (20, 90))
    canvas.paste(right, (1300, 90))
    draw.text((40, 28), "SOURCE-TRUE MASTERPLAN", fill=GREEN[:3], font=font(26))
    draw.text((1320, 28), "ILLUSTRATED MAP — SAME CANONICAL STATE", fill=GREEN[:3], font=font(26))
    draw.line((1280, 20, 1280, 800), fill=(180, 151, 82), width=2)
    canvas.save(REPORT / "KAGA-ILLUSTRATED-MAP-BEFORE-AFTER.png", optimize=True)


def layer_build() -> None:
    sources = [
        ("LAND", "illustrated-land.webp"),
        ("WATER", "illustrated-water.webp"),
        ("PATHS", "illustrated-paths.webp"),
        ("VEGETATION", "illustrated-vegetation.webp"),
        ("ARCHITECTURE", "illustrated-architecture.webp"),
    ]
    canvas = Image.new("RGB", (2560, 1120), IVORY[:3])
    cumulative = Image.new("RGBA", (2800, 1998), (0, 0, 0, 0))
    for index, (label, filename) in enumerate(sources):
        cumulative.alpha_composite(Image.open(ASSETS / filename).convert("RGBA"))
        stage = Image.new("RGBA", cumulative.size, IVORY)
        stage.alpha_composite(cumulative)
        thumbnail = fit(stage.convert("RGB"), (800, 450))
        column, row = index % 3, index // 3
        x, y = 35 + column * 840, 120 + row * 500
        canvas.paste(thumbnail, (x, y))
        ImageDraw.Draw(canvas).text((x, y - 42), f"{index + 1:02d}  {label}", fill=GREEN[:3], font=font(24))
    ImageDraw.Draw(canvas).text((35, 26), "KAGA ILLUSTRATED MAP — CONTROLLED LAYER BUILD", fill=GREEN[:3], font=font(30))
    canvas.save(REPORT / "KAGA-ILLUSTRATED-MAP-LAYER-BUILD.png", optimize=True)


if __name__ == "__main__":
    REPORT.mkdir(parents=True, exist_ok=True)
    before_after()
    layer_build()
