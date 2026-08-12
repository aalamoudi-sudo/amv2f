from __future__ import annotations

import hashlib
import os
from pathlib import Path
import stat
import zipfile

ROOT = Path(__file__).resolve().parents[2]
DIST = ROOT / os.environ.get("KAGA_RUNTIME_DIST", "dist-kaga-absolute-final")
DELIVERABLES = ROOT / "deliverables"
CLIENT_SUPPORT = DELIVERABLES / "kaga-final"
RELEASE = DELIVERABLES / "kaga-absolute-final-release"
CLIENT_ZIP = RELEASE / "KAGA-ABSOLUTE-FINAL-Executive-Presentation.zip"
DEVELOPER_ZIP = RELEASE / "KAGA-ABSOLUTE-FINAL-Developer-Archive.zip"
FORBIDDEN_RUNTIME_EXTENSIONS = {".3dm", ".ai", ".ts", ".tsx"}
FORBIDDEN_RUNTIME_SEGMENTS = {
    "specifications", "visual-direction", "reports", "tests", "docs", "spatial-v2",
}
FORBIDDEN_RUNTIME_FILENAMES = {
    "selected-layers.json", "source-linework.geojson", "spatial-metadata.json",
    "registered-spatial-metadata.json", "manifest.json", "registration.json",
}
REQUIRED_RUNTIME_PATHS = {
    "index.html",
    "kaga/illustrated-map/illustrated-composite.webp",
    "kaga/spatial-registered-v1/executive-masterplan.svg",
    "kaga/spatial-registered-v1/registered-gardens.geojson",
    "kaga/source/Rev06-King-Abdullah-Gardens-Inauguration.pdf",
}
FORBIDDEN_RUNTIME_METADATA_KEYS = {
    "sourceObjectIndex", "sourceLayer", "footprintId", "sourceRhinoSha256",
    "registrationMethod", "semanticEvidence",
}


def add_file(archive: zipfile.ZipFile, source: Path, target: str, executable: bool = False) -> None:
    info = zipfile.ZipInfo(target)
    info.date_time = (2026, 8, 9, 0, 0, 0)
    info.compress_type = zipfile.ZIP_DEFLATED
    info.external_attr = ((stat.S_IFREG | (0o755 if executable else 0o644)) << 16)
    archive.writestr(info, source.read_bytes())


def runtime_violation(path: Path) -> str | None:
    normalized = path.as_posix().lstrip("./")
    parts = {part.lower() for part in Path(normalized).parts}
    if segment := next((segment for segment in FORBIDDEN_RUNTIME_SEGMENTS if segment in parts), None):
        return f"forbidden segment {segment}"
    if path.name.lower() in FORBIDDEN_RUNTIME_FILENAMES:
        return f"forbidden filename {path.name}"
    if path.suffix.lower() in FORBIDDEN_RUNTIME_EXTENSIONS:
        return f"forbidden extension {path.suffix}"
    return None


def assert_client_runtime(runtime_files: list[Path]) -> None:
    relative_files = [path.relative_to(DIST) for path in runtime_files]
    forbidden = [(path, runtime_violation(path)) for path in relative_files if runtime_violation(path)]
    if forbidden:
        raise RuntimeError(f"Forbidden client runtime files: {forbidden}")
    existing = {path.as_posix() for path in relative_files}
    missing = sorted(REQUIRED_RUNTIME_PATHS - existing)
    if missing:
        raise RuntimeError(f"Missing required client runtime files: {missing}")
    for path in runtime_files:
        if path.suffix.lower() not in {".json", ".geojson"}:
            continue
        contents = path.read_text(encoding="utf-8")
        leaked = sorted(key for key in FORBIDDEN_RUNTIME_METADATA_KEYS if f'"{key}"' in contents)
        if leaked:
            raise RuntimeError(f"Internal spatial metadata in {path.relative_to(DIST)}: {leaked}")


def assert_client_archive() -> None:
    with zipfile.ZipFile(CLIENT_ZIP) as archive:
        names = [name for name in archive.namelist() if not name.endswith("/")]
        forbidden = [
            (name, runtime_violation(Path(name.removeprefix("app/"))))
            for name in names
            if name.startswith("app/") and runtime_violation(Path(name.removeprefix("app/")))
        ]
        if forbidden:
            raise RuntimeError(f"Forbidden client archive files: {forbidden}")
        for name in names:
            if not name.startswith("app/") or Path(name).suffix.lower() not in {".json", ".geojson"}:
                continue
            contents = archive.read(name).decode("utf-8")
            leaked = sorted(key for key in FORBIDDEN_RUNTIME_METADATA_KEYS if f'"{key}"' in contents)
            if leaked:
                raise RuntimeError(f"Internal spatial metadata in client archive {name}: {leaked}")
        bad = archive.testzip()
        if bad:
            raise RuntimeError(f"Corrupt client archive member: {bad}")


def build_client() -> None:
    runtime_files = [path for path in DIST.rglob("*") if path.is_file()]
    assert_client_runtime(runtime_files)
    with zipfile.ZipFile(CLIENT_ZIP, "w", allowZip64=True) as archive:
        for source in sorted(runtime_files):
            add_file(archive, source, f"app/{source.relative_to(DIST).as_posix()}")
        add_file(archive, CLIENT_SUPPORT / "README_AR.md", "README_AR.md")
        add_file(archive, CLIENT_SUPPORT / "START_KAGA.command", "START_KAGA.command", executable=True)
        add_file(archive, CLIENT_SUPPORT / "START_KAGA_WINDOWS.bat", "START_KAGA_WINDOWS.bat")
    assert_client_archive()


def developer_files() -> list[Path]:
    explicit = [
        "AGENTS.md", "README.md", "index.html", "package.json", "pnpm-lock.yaml",
        "playwright.config.ts", "render.yaml", "tsconfig.json", "tsconfig.app.json",
        "tsconfig.node.json", "vite.config.ts",
    ]
    files = [ROOT / item for item in explicit if (ROOT / item).is_file()]
    patterns = [
        "src/features/kaga/**/*", "public/kaga/**/*", "tests/e2e/kaga*.spec.ts",
        "scripts/kaga*/**/*", "docs/*KAGA*", "docs/*LEGENDARY*", "docs/*PRESENTATION*",
        "docs/*ILLUSTRAT*", "docs/*SPATIAL*", "docs/*ROUTE*", "docs/*KNOWLEDGE*",
        "reports/kaga-final/**/*", "reports/kaga-absolute-final/**/*", "deliverables/kaga-final/*",
    ]
    for pattern in patterns:
        files.extend(path for path in ROOT.glob(pattern) if path.is_file())
    excluded = {
        ROOT / "reports" / "kaga-final" / "RELEASE_MANIFEST.md",
        ROOT / "reports" / "kaga-absolute-final" / "RELEASE_MANIFEST.md",
    }
    return sorted(set(files) - excluded)


def build_developer() -> None:
    with zipfile.ZipFile(DEVELOPER_ZIP, "w", allowZip64=True) as archive:
        for source in developer_files():
            if source.suffix.lower() in {".3dm", ".ai"}:
                continue
            add_file(archive, source, source.relative_to(ROOT).as_posix(), executable=os.access(source, os.X_OK))


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


if __name__ == "__main__":
    RELEASE.mkdir(parents=True, exist_ok=True)
    build_client()
    build_developer()
    checksums = "\n".join(f"{sha256(path)}  {path.name}" for path in (CLIENT_ZIP, DEVELOPER_ZIP)) + "\n"
    (RELEASE / "KAGA-ABSOLUTE-FINAL-SHA256.txt").write_text(checksums, encoding="utf-8")
    print(checksums, end="")
