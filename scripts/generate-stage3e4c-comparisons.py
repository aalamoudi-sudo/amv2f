#!/usr/bin/env python3
"""Generate deterministic Stage 3E.4C side-by-side review comparisons."""

from __future__ import annotations

import hashlib
import json
import shutil
import sys
from pathlib import Path

from PIL import Image, ImageChops


RESOLUTIONS = ("1366x768", "1920x1080", "2560x1080")
MATERIAL_CHANNEL_DIFFERENCE = 18
PAIRS = (
    ("default-map", "02-experience-map-default.png", "01-default-clear-map.png"),
    ("conflicted-walkway", "03-experience-conflict-selection.png", "12-conflicted-walkway-marker.png"),
    ("independent-landmark", "04-independent-landmark-selection.png", "11-independent-landmark.png"),
    ("executive-blocker", "06-executive-command-overview.png", "14-executive-blocker.png"),
    ("journey-arrival", "09-journey-arrival.png", "15-journey-arrival-step.png"),
    ("technical-truth", "15-technical-truth-drawer.png", "22-technical-truth-drawer.png"),
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def changed_pixel_ratio(before: Image.Image, after: Image.Image) -> float:
    difference = ImageChops.difference(before.convert("RGB"), after.convert("RGB"))
    changed = sum(
        1
        for pixel in difference.get_flattened_data()
        if max(pixel) >= MATERIAL_CHANNEL_DIFFERENCE
    )
    return changed / (before.width * before.height)


def main() -> None:
    if len(sys.argv) != 4:
        raise SystemExit("usage: generate-stage3e4c-comparisons.py BEFORE_ROOT AFTER_ROOT OUTPUT_ROOT")
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
                ratio = changed_pixel_ratio(before, after)
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

    minimum_ratio = min(float(record["changedPixelRatio"]) for record in records)
    if minimum_ratio < 0.01:
        raise RuntimeError(f"Visual comparison does not show a material state change: {minimum_ratio:.4f}")
    manifest = {
        "stage": "3E.4C",
        "method": "RGB absolute difference with per-channel threshold of 18",
        "sideBySideLayout": "unaltered Stage 3E.4B before on left and unaltered Stage 3E.4C after on right",
        "comparisonCount": len(records),
        "minimumChangedPixelRatio": round(minimum_ratio, 6),
        "records": records,
    }
    (output_root / "comparisons.json").write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
