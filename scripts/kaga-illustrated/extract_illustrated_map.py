#!/usr/bin/env python3
"""Read-only Illustrator/PDF layer extraction for the KAGA illustrated map.

The raw AI file is never copied to public/. Optional-content groups are rendered
to processed WebP assets, with source label layers deliberately excluded.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import tempfile
from pathlib import Path

from PIL import Image
from pypdf import PdfReader, PdfWriter
from pypdf.generic import ArrayObject, NameObject


EXPECTED_SHA256 = "be5ae3075ca9b7afa1fcfdb58b4178f67b1b6a87a7bd3d0733cdd7a3ebc46c00"
CROP_BOX = (0, 0, 2800, 1998)
LAYER_GROUPS = {
    "land": ["Circil"],
    "water": ["lake"],
    "paths": ["Walking path 2", "Walking path"],
    "vegetation": ["Trees"],
    "architecture": ["tent"],
}
EXCLUDED_RUNTIME_LAYERS = ["BG", "new stuff", "Layer 5", "Jurassic", "Layer 7", "Legends", "map"]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_layer_pdf(source: Path, output: Path, selected_names: set[str]) -> None:
    reader = PdfReader(source)
    writer = PdfWriter()
    writer.clone_document_from_reader(reader)
    root = writer._root_object
    groups = root["/OCProperties"]["/OCGs"]
    enabled, disabled = ArrayObject(), ArrayObject()
    for group in groups:
        name = str(group.get_object().get("/Name"))
        (enabled if name in selected_names else disabled).append(group)
    root["/OCProperties"]["/D"][NameObject("/ON")] = enabled
    root["/OCProperties"]["/D"][NameObject("/OFF")] = disabled
    with output.open("wb") as stream:
        writer.write(stream)


def render_pdf(pdf: Path, output_prefix: Path) -> Path:
    executable = shutil.which("pdftoppm")
    if not executable:
        raise RuntimeError("pdftoppm is required to extract the Illustrator PDF wrapper")
    subprocess.run(
        [executable, "-singlefile", "-png", "-r", "72", str(pdf), str(output_prefix)],
        check=True,
    )
    return output_prefix.with_suffix(".png")


def white_to_alpha(source: Path, output: Path) -> None:
    image = Image.open(source).convert("RGBA").crop(CROP_BOX)
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            red, green, blue, alpha = pixels[x, y]
            if red >= 250 and green >= 250 and blue >= 250:
                pixels[x, y] = (red, green, blue, 0)
            elif red >= 242 and green >= 242 and blue >= 242:
                edge_alpha = min(255, (250 - min(red, green, blue)) * 32)
                pixels[x, y] = (red, green, blue, min(alpha, edge_alpha))
    image.save(output, "WEBP", quality=88, method=6, lossless=False)


def composite_layers(paths: list[Path], output: Path) -> None:
    canvas = Image.new("RGBA", (CROP_BOX[2], CROP_BOX[3]), (0, 0, 0, 0))
    for path in paths:
        canvas.alpha_composite(Image.open(path).convert("RGBA"))
    canvas.save(output, "WEBP", quality=90, method=6, lossless=False)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=Path("public/kaga/illustrated-map"))
    args = parser.parse_args()

    actual_hash = sha256(args.source)
    if actual_hash != EXPECTED_SHA256:
        raise SystemExit(f"Illustrator source hash mismatch: {actual_hash}")

    args.output.mkdir(parents=True, exist_ok=True)
    reader = PdfReader(args.source)
    groups = [str(group.get_object().get("/Name")) for group in reader.trailer["/Root"]["/OCProperties"]["/OCGs"]]
    produced: list[Path] = []
    with tempfile.TemporaryDirectory(prefix="kaga-illustrated-") as temp_dir:
        temp = Path(temp_dir)
        for runtime_name, source_names in LAYER_GROUPS.items():
            layer_pdf = temp / f"{runtime_name}.pdf"
            write_layer_pdf(args.source, layer_pdf, set(source_names))
            png = render_pdf(layer_pdf, temp / runtime_name)
            destination = args.output / f"illustrated-{runtime_name}.webp"
            white_to_alpha(png, destination)
            produced.append(destination)
    composite_layers(produced, args.output / "illustrated-composite.webp")

    manifest = {
        "schemaVersion": "1.0.0",
        "sourceRole": "visual-cartographic-source",
        "sourceSha256": actual_hash,
        "sourceBytes": args.source.stat().st_size,
        "illustratorCreator": "Adobe Illustrator 30.5 (Macintosh)",
        "pageSizePoints": [3392.07, 1997.7],
        "sourceLayers": groups,
        "runtimeGroups": LAYER_GROUPS,
        "excludedRuntimeLayers": EXCLUDED_RUNTIME_LAYERS,
        "cropPixelsAt72Dpi": list(CROP_BOX),
        "canonicalCoordinateSpace": "KAGA-SOURCE-2D-V1",
        "rawAiShipped": False,
    }
    (args.output / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
