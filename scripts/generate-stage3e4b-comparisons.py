#!/usr/bin/env python3
"""Generate deterministic Stage 3E.4B side-by-side review comparisons."""

from __future__ import annotations

import hashlib
import json
import shutil
import sys
from pathlib import Path

from PIL import Image, ImageChops


RESOLUTIONS = ("1366x768", "1920x1080", "2560x1080")
PRIMARY_COMMAND_STATES = {"candidate-default", "executive-command", "visitor-journey"}
FIXED_APP_SHELL_HEIGHT = 140
MATERIAL_CHANNEL_DIFFERENCE = 18
PAIRS = (
    ("portfolio", "01-before-portfolio.png", "01-kap-spatial-portfolio.png"),
    ("candidate-default", "02-before-candidate-default.png", "02-experience-map-default.png"),
    ("marker-selected", "03-before-marker-selected.png", "03-experience-conflict-selection.png"),
    ("executive-command", "02-before-candidate-default.png", "06-executive-command-overview.png"),
    ("visitor-journey", "02-before-candidate-default.png", "09-journey-arrival.png"),
    ("missing-visitor-map", "04-before-missing-visitor-map.png", "14-missing-visitor-map.png"),
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def changed_pixel_ratio(before: Image.Image, after: Image.Image, crop_top: int = 0) -> float:
    if crop_top:
        before = before.crop((0, crop_top, before.width, before.height))
        after = after.crop((0, crop_top, after.width, after.height))
    difference = ImageChops.difference(before.convert("RGB"), after.convert("RGB"))
    changed = sum(
        1
        for pixel in difference.get_flattened_data()
        if max(pixel) >= MATERIAL_CHANNEL_DIFFERENCE
    )
    return changed / (before.width * before.height)


def main() -> None:
    if len(sys.argv) != 4:
        raise SystemExit("usage: generate-stage3e4b-comparisons.py BEFORE_ROOT AFTER_ROOT OUTPUT_ROOT")
    before_root = Path(sys.argv[1]).resolve()
    after_root = Path(sys.argv[2]).resolve()
    output_root = Path(sys.argv[3]).resolve()
    if output_root.exists():
        shutil.rmtree(output_root)
    output_root.mkdir(parents=True)

    records: list[dict[str, object]] = []
    for resolution in RESOLUTIONS:
        width, height = (int(value) for value in resolution.split("x"))
        destination = output_root / resolution
        destination.mkdir()
        for index, (state, before_name, after_name) in enumerate(PAIRS, start=1):
            before_path = before_root / resolution / before_name
            after_path = after_root / resolution / after_name
            if not before_path.is_file() or before_path.is_symlink():
                raise RuntimeError(f"Missing or unsafe before screenshot: {before_path}")
            if not after_path.is_file() or after_path.is_symlink():
                raise RuntimeError(f"Missing or unsafe after screenshot: {after_path}")
            with Image.open(before_path) as before_image, Image.open(after_path) as after_image:
                before = before_image.convert("RGB")
                after = after_image.convert("RGB")
                if before.size != (width, height) or after.size != (width, height):
                    raise RuntimeError(f"Screenshot dimensions do not match {resolution}: {state}")
                ratio = changed_pixel_ratio(
                    before,
                    after,
                    FIXED_APP_SHELL_HEIGHT if state in PRIMARY_COMMAND_STATES else 0,
                )
                comparison = Image.new("RGB", (width * 2, height), "#ffffff")
                comparison.paste(before, (0, 0))
                comparison.paste(after, (width, 0))
                filename = f"{index:02d}-{state}-before-after.png"
                output_path = destination / filename
                comparison.save(output_path, format="PNG", compress_level=6)
            records.append(
                {
                    "resolution": resolution,
                    "state": state,
                    "file": f"{resolution}/{filename}",
                    "beforeFile": f"{resolution}/{before_name}",
                    "afterFile": f"{resolution}/{after_name}",
                    "width": width * 2,
                    "height": height,
                    "changedPixelRatio": round(ratio, 6),
                    "sha256": sha256(output_path),
                }
            )

    primary = [record for record in records if record["state"] in PRIMARY_COMMAND_STATES]
    minimum_primary_ratio = min(float(record["changedPixelRatio"]) for record in primary)
    if minimum_primary_ratio < 0.30:
        raise RuntimeError(f"Primary visual difference below 30 percent: {minimum_primary_ratio:.4f}")
    manifest = {
        "stage": "3E.4B",
        "method": (
            "RGB absolute difference with per-channel threshold of 18; "
            "primary command ratios exclude the unchanged 140px application shell"
        ),
        "sideBySideLayout": "unaltered before on left, unaltered after on right, no artificial strip",
        "comparisonCount": len(records),
        "minimumPrimaryChangedPixelRatio": round(minimum_primary_ratio, 6),
        "records": records,
    }
    (output_root / "comparisons.json").write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps({
        "comparisonCount": len(records),
        "minimumPrimaryChangedPixelRatio": round(minimum_primary_ratio, 6),
        "outputRoot": str(output_root),
    }, indent=2))


if __name__ == "__main__":
    main()
