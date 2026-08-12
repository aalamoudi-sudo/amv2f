#!/usr/bin/env python3
"""Read-only KAGA V2 presentation geometry extraction from the source 3DM.

The script deliberately does not rewrite the Rhino source. It emits a compact,
provisional 2D presentation model and a machine-readable audit beside it.

Usage:
  python scripts/kaga-v2/extract_spatial.py \
    --source "/path/to/Kaig-mastersite  (2).3dm" \
    --output public/kaga/spatial-v2
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from collections import Counter, defaultdict
from dataclasses import dataclass
from importlib.metadata import version
from pathlib import Path
from typing import Any, Iterable, Sequence

import rhino3dm
from shapely.geometry import LineString, Polygon, mapping


SOURCE_LINEWORK_LAYER = "curves"
PATHWAYS_LAYER = (
    "S19093-0200S-Pathways and Service Access Roads$0$"
    "L-SECONDARY ROAD HATCH"
)
MAKE2D_LAYER = "Make2D::Visible::Curves"

SOURCE_PREFIXES = (
    "DAR New Master Plan 100% 19-06-2024",
    "DAR New Master Plan 100% Gray",
    "1-Master Plan Rev-07. clear copy",
    "Layout Submittal Draft (1)$0$Master Plan Rev-06 Final",
    "S19093-0200S-Pathways and Service Access Roads",
    "- S19093-0200S-Discovery Garden",
    "- S19093-0200S-Maze Garden",
    "S19093-0200S-butterfly garden",
)

SVG_PADDING_METERS = 28.0
LINEWORK_MIN_DIAGONAL_METERS = 3.0
LINEWORK_MAX_ABS_Z_METERS = 0.30
LINEWORK_SIMPLIFY_METERS = 0.45
PATH_SIMPLIFY_METERS = 0.20
SITE_FRAME_MARGIN_METERS = 260.0
GARDEN_MIN_AREA_SQM = 1_450.0
GARDEN_MAX_AREA_SQM = 8_000.0
GARDEN_MIN_COMPACTNESS = 0.12


@dataclass(frozen=True)
class Bounds:
    min_x: float
    min_y: float
    max_x: float
    max_y: float

    @property
    def width(self) -> float:
        return self.max_x - self.min_x

    @property
    def height(self) -> float:
        return self.max_y - self.min_y

    def to_list(self, digits: int = 3) -> list[float]:
        return [
            round(self.min_x, digits),
            round(self.min_y, digits),
            round(self.max_x, digits),
            round(self.max_y, digits),
        ]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    return parser.parse_args()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        while chunk := source.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def layer_by_name(model: rhino3dm.File3dm, full_path: str) -> Any:
    for layer in model.Layers:
        if layer.FullPath == full_path:
            return layer
    raise RuntimeError(f"Required Rhino layer not found: {full_path}")


def curve_objects(model: rhino3dm.File3dm, layer_index: int) -> Iterable[tuple[int, Any]]:
    for object_index, obj in enumerate(model.Objects):
        if obj.Attributes.LayerIndex != layer_index:
            continue
        if "Curve" not in type(obj.Geometry).__name__:
            continue
        yield object_index, obj.Geometry


def curve_points(curve: Any, max_samples: int = 240) -> list[tuple[float, float]]:
    try:
        polyline = curve.TryGetPolyline()
        if polyline and len(polyline) >= 2:
            return [(point.X, point.Y) for point in polyline]
    except (AttributeError, TypeError):
        pass

    bounds = curve.GetBoundingBox()
    diagonal = math.hypot(
        bounds.Max.X - bounds.Min.X,
        bounds.Max.Y - bounds.Min.Y,
    )
    sample_count = max(14, min(max_samples, int(diagonal / 2.0) + 2))
    domain = curve.Domain
    return [
        (
            curve.PointAt(domain.T0 + (domain.T1 - domain.T0) * index / (sample_count - 1)).X,
            curve.PointAt(domain.T0 + (domain.T1 - domain.T0) * index / (sample_count - 1)).Y,
        )
        for index in range(sample_count)
    ]


def selected_linework(
    model: rhino3dm.File3dm,
    layer_index: int,
    site_frame: Bounds,
) -> list[dict[str, Any]]:
    output: list[dict[str, Any]] = []
    for object_index, curve in curve_objects(model, layer_index):
        bounds = curve.GetBoundingBox()
        diagonal = math.hypot(
            bounds.Max.X - bounds.Min.X,
            bounds.Max.Y - bounds.Min.Y,
        )
        if diagonal < LINEWORK_MIN_DIAGONAL_METERS:
            continue
        if (
            abs(bounds.Min.Z) > LINEWORK_MAX_ABS_Z_METERS
            or abs(bounds.Max.Z) > LINEWORK_MAX_ABS_Z_METERS
        ):
            continue
        if (
            bounds.Min.X < site_frame.min_x
            or bounds.Min.Y < site_frame.min_y
            or bounds.Max.X > site_frame.max_x
            or bounds.Max.Y > site_frame.max_y
        ):
            continue
        points = curve_points(curve)
        line = LineString(points).simplify(LINEWORK_SIMPLIFY_METERS)
        if line.is_empty or len(line.coords) < 2:
            continue
        output.append(
            {
                "objectIndex": object_index,
                "geometryType": type(curve).__name__,
                "closed": bool(curve.IsClosed),
                "points": list(line.coords),
                "sourceBounds": bounds,
            }
        )
    return output


def selected_pathways(model: rhino3dm.File3dm, layer_index: int) -> list[dict[str, Any]]:
    output: list[dict[str, Any]] = []
    for object_index, curve in curve_objects(model, layer_index):
        points = curve_points(curve)
        line = LineString(points).simplify(PATH_SIMPLIFY_METERS)
        if line.is_empty or len(line.coords) < 2:
            continue
        output.append(
            {
                "objectIndex": object_index,
                "geometryType": type(curve).__name__,
                "points": list(line.coords),
                "sourceBounds": curve.GetBoundingBox(),
            }
        )
    return output


def bounds_for(items: Sequence[dict[str, Any]]) -> Bounds:
    boxes = [item["sourceBounds"] for item in items]
    return Bounds(
        min(box.Min.X for box in boxes),
        min(box.Min.Y for box in boxes),
        max(box.Max.X for box in boxes),
        max(box.Max.Y for box in boxes),
    )


def union_bounds(*bounds: Bounds) -> Bounds:
    return Bounds(
        min(item.min_x for item in bounds),
        min(item.min_y for item in bounds),
        max(item.max_x for item in bounds),
        max(item.max_y for item in bounds),
    )


def canonical_bounds(source_bounds: Bounds) -> Bounds:
    return Bounds(
        source_bounds.min_x - SVG_PADDING_METERS,
        source_bounds.min_y - SVG_PADDING_METERS,
        source_bounds.max_x + SVG_PADDING_METERS,
        source_bounds.max_y + SVG_PADDING_METERS,
    )


def to_canonical(point: Sequence[float], contract_bounds: Bounds) -> tuple[float, float]:
    return (
        point[0] - contract_bounds.min_x,
        contract_bounds.max_y - point[1],
    )


def polygon_from_curve(item: dict[str, Any]) -> Polygon | None:
    if not item["closed"]:
        return None
    polygon = Polygon(item["points"])
    if not polygon.is_valid:
        polygon = polygon.buffer(0)
    if polygon.is_empty or polygon.geom_type != "Polygon":
        return None
    return polygon


def find_garden_candidates(linework: Sequence[dict[str, Any]]) -> list[dict[str, Any]]:
    candidates: list[dict[str, Any]] = []
    for item in linework:
        polygon = polygon_from_curve(item)
        if polygon is None:
            continue
        area = polygon.area
        min_x, min_y, max_x, max_y = polygon.bounds
        box_area = (max_x - min_x) * (max_y - min_y)
        compactness = area / box_area if box_area else 0.0
        if not (GARDEN_MIN_AREA_SQM <= area <= GARDEN_MAX_AREA_SQM):
            continue
        if compactness < GARDEN_MIN_COMPACTNESS:
            continue

        centroid = polygon.centroid
        duplicate = next(
            (
                other
                for other in candidates
                if centroid.distance(other["polygon"].centroid) < 2.0
                and abs(area - other["polygon"].area) / max(area, 1.0) < 0.04
            ),
            None,
        )
        if duplicate is not None:
            continue
        candidates.append({"source": item, "polygon": polygon})

    candidates.sort(key=lambda item: (item["polygon"].centroid.y, item["polygon"].centroid.x))
    return candidates


def find_crescent_candidate(linework: Sequence[dict[str, Any]]) -> dict[str, Any]:
    # Source evidence only: the largest near-circular closed curve in the central
    # plan cluster. The semantic registration remains explicitly approximate.
    candidates: list[dict[str, Any]] = []
    for item in linework:
        polygon = polygon_from_curve(item)
        if polygon is None:
            continue
        min_x, min_y, max_x, max_y = polygon.bounds
        width, height = max_x - min_x, max_y - min_y
        if not (250.0 <= width <= 430.0 and 250.0 <= height <= 430.0):
            continue
        ratio = min(width, height) / max(width, height)
        if ratio < 0.72:
            continue
        candidates.append({"source": item, "polygon": polygon})
    if not candidates:
        raise RuntimeError("No source-derived Crescent candidate satisfied the audit filter")
    return max(candidates, key=lambda item: item["polygon"].area)


def canonical_line(points: Sequence[Sequence[float]], bounds: Bounds) -> list[list[float]]:
    return [[round(x, 3), round(y, 3)] for x, y in (to_canonical(point, bounds) for point in points)]


def canonical_polygon(polygon: Polygon, bounds: Bounds) -> Polygon:
    exterior = [to_canonical(point, bounds) for point in polygon.exterior.coords]
    interiors = [
        [to_canonical(point, bounds) for point in ring.coords]
        for ring in polygon.interiors
    ]
    return Polygon(exterior, interiors)


def feature_collection(features: list[dict[str, Any]], metadata: dict[str, Any] | None = None) -> dict[str, Any]:
    result: dict[str, Any] = {"type": "FeatureCollection", "features": features}
    if metadata:
        result["metadata"] = metadata
    return result


def feature(geometry: Any, properties: dict[str, Any]) -> dict[str, Any]:
    return {"type": "Feature", "properties": properties, "geometry": mapping(geometry)}


def svg_path(points: Sequence[Sequence[float]], bounds: Bounds, close: bool = False) -> str:
    canonical = [to_canonical(point, bounds) for point in points]
    if not canonical:
        return ""
    body = " ".join(
        ("M" if index == 0 else "L") + f"{x:.2f},{y:.2f}"
        for index, (x, y) in enumerate(canonical)
    )
    return body + (" Z" if close else "")


def write_json(path: Path, payload: Any) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_spatial_outputs(
    output: Path,
    linework: list[dict[str, Any]],
    pathways: list[dict[str, Any]],
    gardens: list[dict[str, Any]],
    crescent: dict[str, Any],
    bounds: Bounds,
) -> None:
    linework_features = [
        feature(
            LineString(canonical_line(item["points"], bounds)),
            {
                "id": f"source-line-{item['objectIndex']}",
                "sourceLayer": SOURCE_LINEWORK_LAYER,
                "sourceObjectIndex": item["objectIndex"],
                "sourceConfidence": "direct-geometry",
            },
        )
        for item in linework
    ]
    pathway_features = [
        feature(
            LineString(canonical_line(item["points"], bounds)),
            {
                "id": f"pathway-{item['objectIndex']}",
                "sourceLayer": PATHWAYS_LAYER,
                "sourceObjectIndex": item["objectIndex"],
                "sourceConfidence": "direct-geometry",
            },
        )
        for item in pathways
    ]
    garden_features: list[dict[str, Any]] = []
    for index, item in enumerate(gardens, start=1):
        polygon = canonical_polygon(item["polygon"], bounds)
        garden_features.append(
            feature(
                polygon,
                {
                    "id": f"garden-footprint-candidate-{index:02d}",
                    "titleAr": f"بصمة حديقة مرشحة {index:02d}",
                    "sourceLayer": SOURCE_LINEWORK_LAYER,
                    "sourceObjectIndex": item["source"]["objectIndex"],
                    "sourceAreaSqm": round(item["polygon"].area, 1),
                    "sourceConfidence": "candidate-unregistered",
                    "registrationStatus": "requires-site-directory-registration",
                },
            )
        )

    crescent_feature = feature(
        canonical_polygon(crescent["polygon"], bounds),
        {
            "id": "crescent-footprint-candidate-01",
            "titleAr": "مرشح بصمة مبنى الهلالين",
            "sourceLayer": SOURCE_LINEWORK_LAYER,
            "sourceObjectIndex": crescent["source"]["objectIndex"],
            "sourceAreaSqm": round(crescent["polygon"].area, 1),
            "sourceConfidence": "approximate",
            "registrationStatus": "visual-cross-check-required",
        },
    )

    common_metadata = {
        "coordinateSpace": "KAGA-SOURCE-2D-V1",
        "axisDirection": {"x": "right", "y": "down"},
        "units": "model-meters-transformed-to-svg",
    }
    write_json(
        output / "site-boundaries.geojson",
        feature_collection(
            [],
            {
                **common_metadata,
                "status": "unresolved-at-gate-1",
                "notes": (
                    "No Rhino curve was asserted as a physical or cadastral site boundary. "
                    "The extraction envelope is not emitted as source geometry."
                ),
            },
        ),
    )
    write_json(
        output / "pathways.geojson",
        feature_collection(pathway_features, common_metadata),
    )
    write_json(
        output / "garden-footprints.geojson",
        feature_collection(garden_features, common_metadata),
    )
    write_json(
        output / "crescent-footprint.geojson",
        feature_collection([crescent_feature], common_metadata),
    )
    write_json(
        output / "parking.geojson",
        feature_collection(
            [],
            {
                **common_metadata,
                "status": "unresolved-at-gate-1",
                "notes": (
                    "Parking-labelled Rhino geometry is present in a separate sheet/local frame; "
                    "it is not silently affine-fitted into KAGA-SOURCE-2D-V1."
                ),
            },
        ),
    )
    write_json(
        output / "source-linework.geojson",
        feature_collection(linework_features, common_metadata),
    )
    centroid = canonical_polygon(crescent["polygon"], bounds).centroid
    write_json(
        output / "map-landmarks.json",
        {
            "coordinateSpace": "KAGA-SOURCE-2D-V1",
            "landmarks": [
                {
                    "id": "crescent-building-candidate",
                    "titleAr": "مرشح موقع مبنى الهلالين",
                    "point": [round(centroid.x, 3), round(centroid.y, 3)],
                    "sourceLayer": SOURCE_LINEWORK_LAYER,
                    "sourceObjectIndex": crescent["source"]["objectIndex"],
                    "sourceConfidence": "approximate",
                }
            ],
        },
    )

    width, height = bounds.width, bounds.height
    crescent_path = svg_path(crescent["polygon"].exterior.coords, bounds, close=True)
    garden_paths = "\n".join(
        f'    <path data-footprint-id="garden-footprint-candidate-{index:02d}" d="{svg_path(item["polygon"].exterior.coords, bounds, close=True)}" />'
        for index, item in enumerate(gardens, start=1)
    )
    pathway_paths = "\n".join(
        f'    <path d="{svg_path(item["points"], bounds)}" />' for item in pathways
    )
    source_paths = "\n".join(
        f'    <path d="{svg_path(item["points"], bounds, close=item["closed"])}" />'
        for item in linework
    )
    masterplan_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width:.3f} {height:.3f}" role="img" aria-labelledby="title desc">
  <title id="title">المخطط المكاني المستخرج لحدائق الملك عبدالله</title>
  <desc id="desc">استخراج متجهي مبدئي من ملف راينو، مع فصل خطوط المصدر ومسارات الحركة وبصمات الحدائق المرشحة.</desc>
  <metadata>{{"coordinateSpace":"KAGA-SOURCE-2D-V1","source":"Kaig-mastersite  (2).3dm","status":"gate-1-provisional"}}</metadata>
  <g id="garden-footprint-candidates" fill="#88aa83" fill-opacity="0.22" stroke="#4f786a" stroke-width="1.6">
{garden_paths}
  </g>
  <g id="source-linework" fill="none" stroke="#24594f" stroke-opacity="0.48" stroke-width="1.05" vector-effect="non-scaling-stroke">
{source_paths}
  </g>
  <g id="circulation" fill="none" stroke="#66a59a" stroke-opacity="0.78" stroke-width="2.0" vector-effect="non-scaling-stroke">
{pathway_paths}
  </g>
  <g id="crescent-footprint-candidate" fill="#1f5c50" fill-opacity="0.14" stroke="#b79752" stroke-width="3.0" vector-effect="non-scaling-stroke">
    <path d="{crescent_path}" />
  </g>
</svg>
'''
    (output / "masterplan.svg").write_text(masterplan_svg, encoding="utf-8")

    gardens_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width:.3f} {height:.3f}" role="img" aria-labelledby="title desc">
  <title id="title">بصمات الحدائق المرشحة</title>
  <desc id="desc">طبقة شفافة في نظام KAGA-SOURCE-2D-V1؛ الأسماء تنتظر التسجيل مع دليل الموقع.</desc>
  <metadata>{{"coordinateSpace":"KAGA-SOURCE-2D-V1","status":"candidate-unregistered"}}</metadata>
  <g fill="#5e9078" fill-opacity="0.38" stroke="#b79752" stroke-width="2.2" vector-effect="non-scaling-stroke">
{garden_paths}
  </g>
</svg>
'''
    (output / "garden-footprints.svg").write_text(gardens_svg, encoding="utf-8")


def collect_layer_audit(model: rhino3dm.File3dm) -> list[dict[str, Any]]:
    counts: Counter[int] = Counter(obj.Attributes.LayerIndex for obj in model.Objects)
    geometry_counts: dict[int, Counter[str]] = defaultdict(Counter)
    for obj in model.Objects:
        geometry_counts[obj.Attributes.LayerIndex][type(obj.Geometry).__name__] += 1

    rows: list[dict[str, Any]] = []
    for layer in model.Layers:
        if not any(layer.FullPath.startswith(prefix) for prefix in SOURCE_PREFIXES):
            continue
        rows.append(
            {
                "layerIndex": layer.Index,
                "fullPath": layer.FullPath,
                "visible": layer.Visible,
                "locked": layer.Locked,
                "directObjectCount": counts[layer.Index],
                "directGeometryTypes": dict(geometry_counts[layer.Index]),
            }
        )
    return rows


def aggregate_prefixes(layer_rows: Sequence[dict[str, Any]]) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    for prefix in SOURCE_PREFIXES:
        rows = [row for row in layer_rows if row["fullPath"].startswith(prefix)]
        geometry = Counter()
        for row in rows:
            geometry.update(row["directGeometryTypes"])
        result.append(
            {
                "prefix": prefix,
                "descendantLayerCount": len(rows),
                "directObjectCount": sum(row["directObjectCount"] for row in rows),
                "directGeometryTypes": dict(geometry),
            }
        )
    return result


def main() -> None:
    args = parse_args()
    source = args.source.resolve()
    output = args.output.resolve()
    if not source.is_file():
        raise SystemExit(f"Source file does not exist: {source}")
    output.mkdir(parents=True, exist_ok=True)

    model = rhino3dm.File3dm.Read(str(source))
    if model is None:
        raise SystemExit(f"rhino3dm could not read: {source}")

    linework_layer = layer_by_name(model, SOURCE_LINEWORK_LAYER)
    pathways_layer = layer_by_name(model, PATHWAYS_LAYER)
    make2d_layer = layer_by_name(model, MAKE2D_LAYER)

    pathways = selected_pathways(model, pathways_layer.Index)
    pathway_bounds = bounds_for(pathways)
    site_frame = Bounds(
        pathway_bounds.min_x - SITE_FRAME_MARGIN_METERS,
        pathway_bounds.min_y - SITE_FRAME_MARGIN_METERS,
        pathway_bounds.max_x + SITE_FRAME_MARGIN_METERS,
        pathway_bounds.max_y + SITE_FRAME_MARGIN_METERS,
    )
    linework = selected_linework(model, linework_layer.Index, site_frame)
    raw_bounds = union_bounds(bounds_for(linework), bounds_for(pathways))
    contract_bounds = canonical_bounds(raw_bounds)
    gardens = find_garden_candidates(linework)
    crescent = find_crescent_candidate(linework)

    write_spatial_outputs(
        output,
        linework,
        pathways,
        gardens,
        crescent,
        contract_bounds,
    )

    all_geometry = Counter(type(obj.Geometry).__name__ for obj in model.Objects)
    relevant_rows = collect_layer_audit(model)
    selected_layers = {
        "source": {
            "filename": source.name,
            "bytes": source.stat().st_size,
            "sha256": sha256_file(source),
            "archiveVersion": model.ArchiveVersion,
            "unitSystem": str(model.Settings.ModelUnitSystem),
            "absoluteTolerance": model.Settings.ModelAbsoluteTolerance,
        },
        "modelInventory": {
            "layerCount": len(model.Layers),
            "objectCount": len(model.Objects),
            "instanceDefinitionCount": len(model.InstanceDefinitions),
            "geometryTypes": dict(all_geometry),
        },
        "candidatePrefixAudit": aggregate_prefixes(relevant_rows),
        "selected": [
            {
                "layerIndex": linework_layer.Index,
                "fullPath": linework_layer.FullPath,
                "role": "source-derived masterplan linework",
                "directObjectCount": sum(1 for _ in curve_objects(model, linework_layer.Index)),
                "exportedObjectCount": len(linework),
                "selectionRule": (
                    f"2D curves; |z| <= {LINEWORK_MAX_ABS_Z_METERS}m; "
                    f"XY diagonal >= {LINEWORK_MIN_DIAGONAL_METERS}m; "
                    f"contained within explicit circulation bounds + {SITE_FRAME_MARGIN_METERS}m; "
                    f"simplify {LINEWORK_SIMPLIFY_METERS}m"
                ),
                "sourceConfidence": "provisional-direct-geometry",
            },
            {
                "layerIndex": pathways_layer.Index,
                "fullPath": pathways_layer.FullPath,
                "role": "primary presentation circulation linework",
                "directObjectCount": sum(1 for _ in curve_objects(model, pathways_layer.Index)),
                "exportedObjectCount": len(pathways),
                "selectionRule": f"all curve objects; simplify {PATH_SIMPLIFY_METERS}m",
                "sourceConfidence": "high-for-geometry-medium-for-route-semantics",
            },
            {
                "layerIndex": make2d_layer.Index,
                "fullPath": make2d_layer.FullPath,
                "role": "audited Crescent/building candidate reference only",
                "directObjectCount": sum(1 for _ in curve_objects(model, make2d_layer.Index)),
                "exportedObjectCount": 0,
                "selectionRule": "not merged at Gate 1 because semantic registration is unresolved",
                "sourceConfidence": "unresolved",
            },
        ],
        "derivedCandidates": {
            "gardenFootprintCount": len(gardens),
            "gardenSelectionRule": {
                "closed": True,
                "minAreaSqm": GARDEN_MIN_AREA_SQM,
                "maxAreaSqm": GARDEN_MAX_AREA_SQM,
                "minCompactness": GARDEN_MIN_COMPACTNESS,
                "status": "candidate-unregistered",
            },
            "crescentSourceObjectIndex": crescent["source"]["objectIndex"],
        },
        "relevantLayers": relevant_rows,
    }
    write_json(output / "selected-layers.json", selected_layers)

    metadata = {
        "schemaVersion": "1.0.0",
        "coordinateSpace": "KAGA-SOURCE-2D-V1",
        "status": "gate-1-provisional",
        "source": selected_layers["source"],
        "units": "Rhino model metres",
        "crs": None,
        "crsStatus": "unknown-do-not-treat-as-survey-control",
        "sourceBounds": raw_bounds.to_list(),
        "contractBoundsWithPadding": contract_bounds.to_list(),
        "viewBox": [0, 0, round(contract_bounds.width, 3), round(contract_bounds.height, 3)],
        "transform": {
            "description": "Local Rhino XY to browser SVG coordinates; X translated, Y inverted and translated.",
            "sourceToCanonical": {
                "x": f"sourceX - ({contract_bounds.min_x:.6f})",
                "y": f"({contract_bounds.max_y:.6f}) - sourceY",
            },
            "matrix3x3": [
                [1, 0, round(-contract_bounds.min_x, 6)],
                [0, -1, round(contract_bounds.max_y, 6)],
                [0, 0, 1],
            ],
            "rotation": "none",
            "scale": 1,
        },
        "selectedLayerIds": [linework_layer.Index, pathways_layer.Index],
        "selectedLayerNames": [linework_layer.FullPath, pathways_layer.FullPath],
        "featureCounts": {
            "sourceLinework": len(linework),
            "pathways": len(pathways),
            "gardenFootprintCandidates": len(gardens),
            "siteBoundaryCandidates": 0,
            "crescentFootprintCandidates": 1,
            "parkingFootprints": 0,
        },
        "outputPaths": {
            "masterplanSvg": "/kaga/spatial-v2/masterplan.svg",
            "gardenFootprintsSvg": "/kaga/spatial-v2/garden-footprints.svg",
            "siteBoundaries": "/kaga/spatial-v2/site-boundaries.geojson",
            "pathways": "/kaga/spatial-v2/pathways.geojson",
            "parking": "/kaga/spatial-v2/parking.geojson",
            "gardenFootprints": "/kaga/spatial-v2/garden-footprints.geojson",
            "crescentFootprint": "/kaga/spatial-v2/crescent-footprint.geojson",
            "mapLandmarks": "/kaga/spatial-v2/map-landmarks.json",
            "selectedLayers": "/kaga/spatial-v2/selected-layers.json",
        },
        "generator": {
            "script": "scripts/kaga-v2/extract_spatial.py",
            "rhino3dm": version("rhino3dm"),
            "shapely": version("shapely"),
        },
        "uncertainty": [
            "The 3DM contains multiple plan revisions and mixed local/georeferenced frames.",
            "Layer names alone do not prove design authority.",
            "Garden candidates are geometric candidates only; names await Site Map Directory registration.",
            "The Crescent candidate is a visual registration hypothesis, not an asserted architectural footprint.",
            "Parking geometry remains unresolved because its labelled objects use a separate drawing frame.",
        ],
    }
    write_json(output / "spatial-metadata.json", metadata)

    total_bytes = sum(path.stat().st_size for path in output.iterdir() if path.is_file())
    print(
        json.dumps(
            {
                "output": str(output),
                "files": sorted(path.name for path in output.iterdir() if path.is_file()),
                "totalBytes": total_bytes,
                "featureCounts": metadata["featureCounts"],
                "viewBox": metadata["viewBox"],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
