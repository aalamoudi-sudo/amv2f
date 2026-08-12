from pathlib import Path
import hashlib
import json
import sys

from PIL import Image, ImageDraw


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: generate-stage3g0-comparisons.py REVIEW_ROOT OUTPUT_ROOT")

    review_root = Path(sys.argv[1])
    output_root = Path(sys.argv[2])
    output_root.mkdir(parents=True, exist_ok=True)
    records = []

    for resolution in ("1366x768", "1920x1080", "2560x1080"):
        source_dir = review_root / resolution
        before = Image.open(source_dir / "01-before-legacy-percentage-workspace.png").convert("RGB")
        after = Image.open(source_dir / "02-executive-readiness-overview.png").convert("RGB")
        if before.size != after.size:
            raise ValueError(f"comparison dimensions differ for {resolution}")

        width, height = before.size
        header = 54
        canvas = Image.new("RGB", (width * 2, height + header), "#f4f3ed")
        canvas.paste(before, (0, header))
        canvas.paste(after, (width, header))
        draw = ImageDraw.Draw(canvas)
        draw.rectangle((0, 0, width, header), fill="#59443a")
        draw.rectangle((width, 0, width * 2, header), fill="#315f46")
        draw.text((24, 18), "BEFORE · legacy manual percentage", fill="white")
        draw.text((width + 24, 18), "AFTER · evidence-derived command", fill="white")

        output = output_root / f"before-after-{resolution}.png"
        canvas.save(output, format="PNG", optimize=True)
        records.append({
            "file": output.name,
            "width": canvas.width,
            "height": canvas.height,
            "sha256": sha256(output),
        })

    (output_root / "comparisons.json").write_text(
        json.dumps({"comparisonCount": len(records), "records": records}, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
