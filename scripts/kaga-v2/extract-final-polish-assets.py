#!/usr/bin/env python3
"""Extract clean embedded event visuals without rasterizing PDF page chrome."""

from __future__ import annotations

import hashlib
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "public/kaga/source/Rev06-King-Abdullah-Gardens-Inauguration.pdf"
OUTPUT = ROOT / "public/kaga/assets/v2"

ASSETS = (
    {
        "page": 15,
        "sha256": "88b349c7309ba2eea1c0ac1403a088896e24952dbb0232faab031a76c8e37724",
        "filename": "royal-model-clean-p015.jpg",
    },
    {
        "page": 20,
        "sha256": "b54f7e70b5169b7d7f047bb5c3ebea8f0fde81a396db4608c8970a58415e21f2",
        "filename": "launch-stage-clean-p020.jpg",
    },
)


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def main() -> None:
    reader = PdfReader(SOURCE)
    OUTPUT.mkdir(parents=True, exist_ok=True)

    for asset in ASSETS:
        page = reader.pages[asset["page"] - 1]
        match = next((image.data for image in page.images if digest(image.data) == asset["sha256"]), None)
        if match is None:
            raise RuntimeError(f"Embedded source image not found on PDF page {asset['page']}")
        destination = OUTPUT / asset["filename"]
        destination.write_bytes(match)
        print(f"{destination.relative_to(ROOT)} {len(match)} bytes {digest(match)}")


if __name__ == "__main__":
    main()
