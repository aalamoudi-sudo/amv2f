#!/usr/bin/env python3
"""Read-only semantic instance audit for KAGA-SPATIAL-REGISTERED-V1.

The script expands Rhino instance definitions with their full transform chain,
but never mutates or rewrites the authoritative 3DM. It emits an audit JSON
only; the frozen KAGA-SOURCE-2D-V1 package is not an output target.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
from typing import Any, Iterable

import rhino3dm


EXPECTED_SHA256 = "e754894193c1da6660218757a19adc2f5dfacde7b2f27aefd35597d860007a9e"
CANONICAL_MATRIX = (
    (1.0, 0.0, 0.0, 909.581188),
    (0.0, -1.0, 0.0, -368.753837),
    (0.0, 0.0, 1.0, 0.0),
    (0.0, 0.0, 0.0, 1.0),
)
CONTRACT_BOUNDS = (-909.581, -1739.989, 793.579, -368.754)

SEMANTIC_RULES: dict[str, tuple[str, ...]] = {
    "aviaryGarden": ("aviary garden outline", "kaig3-sga-ag-outline"),
    "soundLightGarden": ("sound and light garden outline", "kaig3-sga-sg-outline"),
    "butterflyGarden": ("butterfly garden outline", "kaig3-sga-tg-outline"),
    "mazeGarden": ("s19093-0200s-maze garden", "maze garden"),
    "discoveryGarden": ("s19093-0200s-discovery garden", "discovery garden"),
    "crescentBuilding": ("017 crescent", "crescent1", "crescent"),
    "make2d": ("make2d::visible::curves",),
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    return parser.parse_args()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def matrix_from_transform(transform: Any) -> tuple[tuple[float, ...], ...]:
    return tuple(
        tuple(float(getattr(transform, f"M{row}{column}")) for column in range(4))
        for row in range(4)
    )


def matrix_multiply(
    left: tuple[tuple[float, ...], ...],
    right: tuple[tuple[float, ...], ...],
) -> tuple[tuple[float, ...], ...]:
    return tuple(
        tuple(sum(left[row][k] * right[k][column] for k in range(4)) for column in range(4))
        for row in range(4)
    )


def transform_point(matrix: tuple[tuple[float, ...], ...], point: Any) -> tuple[float, float, float]:
    values = (float(point.X), float(point.Y), float(point.Z), 1.0)
    return tuple(sum(matrix[row][column] * values[column] for column in range(4)) for row in range(3))  # type: ignore[return-value]


def curve_points(curve: Any, max_samples: int = 220) -> list[tuple[float, float, float]]:
    try:
        polyline = curve.TryGetPolyline()
        if polyline and len(polyline) >= 2:
            return [(float(point.X), float(point.Y), float(point.Z)) for point in polyline]
    except (AttributeError, TypeError):
        pass

    bounds = curve.GetBoundingBox()
    diagonal = math.hypot(bounds.Max.X - bounds.Min.X, bounds.Max.Y - bounds.Min.Y)
    sample_count = max(14, min(max_samples, int(diagonal / 2.0) + 2))
    domain = curve.Domain
    return [
        (
            float(curve.PointAt(domain.T0 + (domain.T1 - domain.T0) * index / (sample_count - 1)).X),
            float(curve.PointAt(domain.T0 + (domain.T1 - domain.T0) * index / (sample_count - 1)).Y),
            float(curve.PointAt(domain.T0 + (domain.T1 - domain.T0) * index / (sample_count - 1)).Z),
        )
        for index in range(sample_count)
    ]


def point_from_values(values: tuple[float, float, float]) -> Any:
    return type("Point", (), {"X": values[0], "Y": values[1], "Z": values[2]})()


def bounds_for(points: Iterable[tuple[float, float, float]]) -> list[float]:
    values = list(points)
    return [
        round(min(point[0] for point in values), 3),
        round(min(point[1] for point in values), 3),
        round(max(point[0] for point in values), 3),
        round(max(point[1] for point in values), 3),
    ]


def intersects_contract(bounds: list[float]) -> bool:
    min_x, min_y, max_x, max_y = CONTRACT_BOUNDS
    return not (bounds[2] < min_x or bounds[0] > max_x or bounds[3] < min_y or bounds[1] > max_y)


def matching_entities(search_text: str) -> list[str]:
    normalized = search_text.casefold()
    return [
        entity_id
        for entity_id, needles in SEMANTIC_RULES.items()
        if any(needle in normalized for needle in needles)
    ]


def main() -> None:
    args = parse_args()
    source_hash = sha256_file(args.source)
    if source_hash != EXPECTED_SHA256:
        raise SystemExit(f"Source hash mismatch: {source_hash}")

    model = rhino3dm.File3dm.Read(str(args.source))
    if model is None:
        raise SystemExit("Unable to read Rhino source")

    layers = {index: layer.FullPath for index, layer in enumerate(model.Layers)}
    objects = {str(obj.Attributes.Id): obj for obj in model.Objects}
    definitions = {str(definition.Id): definition for definition in model.InstanceDefinitions}
    definition_object_ids = {
        object_id
        for definition in model.InstanceDefinitions
        for object_id in map(str, definition.GetObjectIds())
    }

    identity = (
        (1.0, 0.0, 0.0, 0.0),
        (0.0, 1.0, 0.0, 0.0),
        (0.0, 0.0, 1.0, 0.0),
        (0.0, 0.0, 0.0, 1.0),
    )
    results: dict[str, list[dict[str, Any]]] = {key: [] for key in SEMANTIC_RULES}
    cycles: list[list[str]] = []

    def visit_instance(
        instance_object: Any,
        parent_matrix: tuple[tuple[float, ...], ...],
        definition_chain: list[str],
        root_object_id: str,
        active_definitions: set[str],
    ) -> None:
        geometry = instance_object.Geometry
        definition_id = str(geometry.ParentIdefId)
        definition = definitions.get(definition_id)
        if definition is None:
            return
        if definition_id in active_definitions:
            cycles.append([*definition_chain, definition.Name])
            return
        world_matrix = matrix_multiply(parent_matrix, matrix_from_transform(geometry.Xform))
        next_chain = [*definition_chain, definition.Name]
        next_active = {*active_definitions, definition_id}

        for child_id in map(str, definition.GetObjectIds()):
            child = objects.get(child_id)
            if child is None:
                continue
            child_geometry = child.Geometry
            if type(child_geometry).__name__ == "InstanceReference":
                visit_instance(child, world_matrix, next_chain, root_object_id, next_active)
                continue
            if "Curve" not in type(child_geometry).__name__:
                continue
            layer_path = layers.get(child.Attributes.LayerIndex, "")
            search_text = " :: ".join([*next_chain, layer_path])
            entity_ids = matching_entities(search_text)
            if not entity_ids:
                continue
            sampled = curve_points(child_geometry)
            world_points = [
                transform_point(world_matrix, point_from_values(point))
                for point in sampled
            ]
            source_bounds = bounds_for(world_points)
            canonical_points = [
                transform_point(CANONICAL_MATRIX, point_from_values(point))
                for point in world_points
            ]
            record = {
                "objectId": child_id,
                "rootInstanceObjectId": root_object_id,
                "definitionPath": next_chain,
                "layerPath": layer_path,
                "geometryType": type(child_geometry).__name__,
                "closed": bool(getattr(child_geometry, "IsClosed", False)),
                "pointCount": len(world_points),
                "sourceBounds": source_bounds,
                "canonicalBounds": bounds_for(canonical_points),
                "insideGate1Contract": intersects_contract(source_bounds),
                "sourcePoints": [[round(value, 3) for value in point] for point in world_points],
                "canonicalPoints": [[round(value, 3) for value in point[:2]] for point in canonical_points],
            }
            for entity_id in entity_ids:
                results[entity_id].append(record)

    for obj in model.Objects:
        object_id = str(obj.Attributes.Id)
        if object_id in definition_object_ids:
            continue
        geometry = obj.Geometry
        if type(geometry).__name__ == "InstanceReference":
            visit_instance(obj, identity, [], object_id, set())
            continue
        if "Curve" not in type(geometry).__name__:
            continue
        layer_path = layers.get(obj.Attributes.LayerIndex, "")
        for entity_id in matching_entities(layer_path):
            sampled = curve_points(geometry)
            source_bounds = bounds_for(sampled)
            canonical_points = [transform_point(CANONICAL_MATRIX, point_from_values(point)) for point in sampled]
            results[entity_id].append(
                {
                    "objectId": object_id,
                    "rootInstanceObjectId": None,
                    "definitionPath": [],
                    "layerPath": layer_path,
                    "geometryType": type(geometry).__name__,
                    "closed": bool(getattr(geometry, "IsClosed", False)),
                    "pointCount": len(sampled),
                    "sourceBounds": source_bounds,
                    "canonicalBounds": bounds_for(canonical_points),
                    "insideGate1Contract": intersects_contract(source_bounds),
                    "sourcePoints": [[round(value, 3) for value in point] for point in sampled],
                    "canonicalPoints": [[round(value, 3) for value in point[:2]] for point in canonical_points],
                }
            )

    output = {
        "schemaVersion": "1.0.0",
        "designation": "KAGA-SPATIAL-REGISTERED-V1-INSTANCE-AUDIT",
        "source": {"path": str(args.source), "sha256": source_hash},
        "coordinateSpace": "KAGA-SOURCE-2D-V1",
        "statistics": {
            "instanceDefinitionCount": len(definitions),
            "objectCount": len(objects),
            "definitionMemberCount": len(definition_object_ids),
            "cycleCount": len(cycles),
            "matches": {key: len(value) for key, value in results.items()},
            "matchesInsideContract": {
                key: sum(1 for record in value if record["insideGate1Contract"])
                for key, value in results.items()
            },
        },
        "cycles": cycles,
        "entities": results,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(output["statistics"], indent=2))


if __name__ == "__main__":
    main()
