#!/usr/bin/env python3
"""Build the derived KAGA-SPATIAL-REGISTERED-V1 presentation package.

Inputs are the frozen Gate 1 GeoJSON exports. The script never writes into
``public/kaga/spatial-v2`` and verifies the authoritative Rhino hash recorded
by Gate 1 before producing registered semantic assets.
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
from pathlib import Path
from typing import Any

from shapely.geometry import shape


EXPECTED_RHINO_SHA256 = "e754894193c1da6660218757a19adc2f5dfacde7b2f27aefd35597d860007a9e"
VIEW_BOX = (0.0, 0.0, 1703.160, 1371.235)

# Level C/D registration: Knowledge Guide page 13 numbered topology is paired
# with an independently extracted Rhino source curve. Duplicate/ambiguous
# modern-life and Family taxonomies are intentionally not registered.
REGISTRATIONS = (
    ("devonianGarden", "الحديقة الديفونية", "garden-footprint-candidate-20", 10, 1, "Site Directory numbered Crescent topology"),
    ("plioceneGarden", "الحديقة البليوسينية", "garden-footprint-candidate-24", 10, 6, "Site Directory numbered Crescent topology"),
    ("optionsGarden", "حديقة الخيارات", "garden-footprint-candidate-23", 10, 7, "Site Directory numbered Crescent topology"),
    ("butterflyGarden", "حديقة الفراشات", "garden-footprint-candidate-03", 11, 15, "Butterfly Garden Outline + Site Directory location/area cross-check"),
    ("mazeGarden", "حديقة المتاهة", "garden-footprint-candidate-01", 11, 17, "Maze LS-BASE PLAN + Site Directory location/area cross-check"),
    ("soundLightGarden", "حديقة الصوت والضوء", "garden-footprint-candidate-02", 11, 18, "Sound and Light Garden Outline + Site Directory location/area cross-check"),
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--rhino-source", required=True, type=Path)
    parser.add_argument("--gate1", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    return parser.parse_args()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def svg_path(geometry: dict[str, Any]) -> str:
    parts: list[str] = []
    coordinates = geometry["coordinates"]
    if geometry["type"] == "LineString":
        rings = [coordinates]
    elif geometry["type"] == "MultiLineString":
        rings = coordinates
    elif geometry["type"] == "Polygon":
        rings = coordinates
    else:
        return ""
    for ring in rings:
        if len(ring) < 2:
            continue
        parts.append(f"M {ring[0][0]:.3f} {ring[0][1]:.3f}")
        parts.extend(f"L {point[0]:.3f} {point[1]:.3f}" for point in ring[1:])
        if geometry["type"] == "Polygon":
            parts.append("Z")
    return " ".join(parts)


def render_executive_svg(
    linework: dict[str, Any],
    pathways: dict[str, Any],
    registered: dict[str, Any],
) -> str:
    levels: dict[str, list[str]] = {"level1": [], "level3": [], "level4": []}
    for feature in linework["features"]:
        geometry = shape(feature["geometry"])
        path = svg_path(feature["geometry"])
        if not path or geometry.is_empty:
            continue
        if geometry.length >= 520:
            levels["level1"].append(path)
        elif geometry.length >= 62:
            levels["level3"].append(path)
        elif geometry.length >= 5:
            levels["level4"].append(path)

    pathway_paths = [svg_path(feature["geometry"]) for feature in pathways["features"]]
    registered_paths = [
        (feature["properties"]["canonicalGardenId"], svg_path(feature["geometry"]))
        for feature in registered["features"]
    ]

    def path_group(paths: list[str], class_name: str) -> str:
        return f'<g class="{class_name}">' + "".join(
            f'<path d="{html.escape(path, quote=True)}" />' for path in paths if path
        ) + "</g>"

    garden_group = '<g class="registered-gardens">' + "".join(
        f'<path id="{entity_id}" d="{html.escape(path, quote=True)}" />'
        for entity_id, path in registered_paths
    ) + "</g>"
    return "".join(
        [
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1703.160 1371.235" role="img">',
            "<title>المخطط التنفيذي المسجل لحدائق الملك عبدالله</title>",
            "<style>",
            ".level4{fill:none;stroke:#7ba49d;stroke-width:.75;opacity:.19}",
            ".level3{fill:none;stroke:#4e8c84;stroke-width:1.15;opacity:.42}",
            ".level2{fill:none;stroke:#2e746d;stroke-width:2.1;opacity:.64}",
            ".level1{fill:none;stroke:#16574f;stroke-width:2.7;opacity:.78}",
            ".registered-gardens{fill:#6f9d80;fill-opacity:.16;stroke:#b18a47;stroke-width:2.2;opacity:.95}",
            "path{vector-effect:non-scaling-stroke;stroke-linecap:round;stroke-linejoin:round}",
            "</style>",
            path_group(levels["level4"], "level4"),
            path_group(levels["level3"], "level3"),
            path_group(pathway_paths, "level2"),
            path_group(levels["level1"], "level1"),
            garden_group,
            "</svg>",
        ]
    )


def main() -> None:
    args = parse_args()
    source_hash = sha256_file(args.rhino_source)
    if source_hash != EXPECTED_RHINO_SHA256:
        raise SystemExit(f"Authoritative Rhino hash mismatch: {source_hash}")

    metadata = load_json(args.gate1 / "spatial-metadata.json")
    if metadata["source"]["sha256"] != source_hash:
        raise SystemExit("Gate 1 metadata does not identify the verified Rhino source")

    candidates = load_json(args.gate1 / "garden-footprints.geojson")
    linework = load_json(args.gate1 / "source-linework.geojson")
    pathways = load_json(args.gate1 / "pathways.geojson")
    candidate_by_id = {feature["properties"]["id"]: feature for feature in candidates["features"]}

    registered_features: list[dict[str, Any]] = []
    for canonical_id, title_ar, footprint_id, knowledge_page, directory_number, evidence in REGISTRATIONS:
        candidate = candidate_by_id[footprint_id]
        geometry = shape(candidate["geometry"])
        registered_features.append(
            {
                "type": "Feature",
                "properties": {
                    "id": f"registered-{canonical_id}",
                    "canonicalGardenId": canonical_id,
                    "titleAr": title_ar,
                    "footprintId": footprint_id,
                    "sourceObjectIndex": candidate["properties"]["sourceObjectIndex"],
                    "sourceLayer": "curves",
                    "knowledgeGuidePages": [knowledge_page, 13],
                    "siteDirectoryNumber": directory_number,
                    "semanticEvidence": evidence,
                    "registrationMethod": "site-directory-topology-to-rhino-source-curve",
                    "confidence": "high",
                    "centroid": [round(geometry.centroid.x, 3), round(geometry.centroid.y, 3)],
                    "geometryAreaSqm": round(geometry.area, 1),
                    "knowledgeAreaIsIndependent": True,
                },
                "geometry": candidate["geometry"],
            }
        )

    registered = {
        "type": "FeatureCollection",
        "features": registered_features,
        "metadata": {
            "designation": "KAGA-SPATIAL-REGISTERED-V1",
            "coordinateSpace": "KAGA-SOURCE-2D-V1",
            "sourceRhinoSha256": source_hash,
            "evidencePolicy": "Only exact/high registrations are included.",
        },
    }
    crescent = {
        "type": "FeatureCollection",
        "features": [],
        "metadata": {
            "designation": "KAGA-SPATIAL-REGISTERED-V1",
            "coordinateSpace": "KAGA-SOURCE-2D-V1",
            "canonicalEntityId": "crescentBuilding",
            "confidence": "unresolved",
            "reason": "Explicit Crescent XREF geometry could not be defensibly reconciled to the frozen Gate 1 coordinate contract; the Gate 1 circular candidate is not a building footprint.",
        },
    }

    args.output.mkdir(parents=True, exist_ok=True)
    (args.output / "registered-gardens.geojson").write_text(
        json.dumps(registered, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (args.output / "registered-crescent.geojson").write_text(
        json.dumps(crescent, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (args.output / "executive-masterplan.svg").write_text(
        render_executive_svg(linework, pathways, registered), encoding="utf-8"
    )
    summary = {
        "schemaVersion": "1.0.0",
        "designation": "KAGA-SPATIAL-REGISTERED-V1",
        "sourceBaseline": "KAGA-SOURCE-2D-V1",
        "sourceRhinoSha256": source_hash,
        "coordinateSpace": metadata["coordinateSpace"],
        "viewBox": VIEW_BOX,
        "registeredNamedGardenCount": len(registered_features),
        "registeredGardenIds": [feature["properties"]["canonicalGardenId"] for feature in registered_features],
        "crescentConfidence": "unresolved",
        "rawGate1PackageMutated": False,
    }
    (args.output / "registered-spatial-metadata.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
