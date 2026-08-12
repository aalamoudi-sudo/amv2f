from pathlib import Path
import hashlib
import json
import sys

from PIL import Image, ImageDraw


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    if len(sys.argv) != 4:
        raise SystemExit(
            "usage: generate-stage3g0a-comparison.py BEFORE_MATRIX AFTER_MATRIX OUTPUT_ROOT"
        )

    before_path = Path(sys.argv[1])
    after_path = Path(sys.argv[2])
    output_root = Path(sys.argv[3])
    output_root.mkdir(parents=True, exist_ok=True)
    before = Image.open(before_path).convert("RGB")
    after = Image.open(after_path).convert("RGB")
    if before.size != (1366, 768) or after.size != (1366, 768):
        raise ValueError("Stage 3G.0A comparison requires two 1366x768 screenshots.")

    width, height = before.size
    header = 54
    canvas = Image.new("RGB", (width * 2, height + header), "#f4f3ed")
    canvas.paste(before, (0, header))
    canvas.paste(after, (width, header))
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 0, width, header), fill="#7b4037")
    draw.rectangle((width, 0, width * 2, header), fill="#315f46")
    draw.text((24, 18), "BEFORE · 253px content / 3 visible rows", fill="white")
    draw.text(
        (width + 24, 18),
        "AFTER · 395px content / 5 visible rows",
        fill="white",
    )

    output = output_root / "before-after-density-1366x768.png"
    canvas.save(output, format="PNG", optimize=True)
    record = {
        "file": output.name,
        "width": canvas.width,
        "height": canvas.height,
        "sha256": sha256(output),
        "beforeSource": "Stage 3G.0 review matrix at approved feature head",
        "afterSource": "Stage 3G.0A compact matrix at final feature head",
    }
    (output_root / "comparisons.json").write_text(
        json.dumps({"comparisonCount": 1, "records": [record]}, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
