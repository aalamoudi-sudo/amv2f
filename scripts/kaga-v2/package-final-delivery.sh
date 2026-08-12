#!/bin/bash
set -euo pipefail

KAGA_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
KAGA_BUILD="$KAGA_ROOT/dist-kaga-v2-final"
KAGA_DELIVERABLES="$KAGA_ROOT/deliverables"
KAGA_STAGE="$(mktemp -d)"

trap 'find "$KAGA_STAGE" -depth -delete 2>/dev/null || true' EXIT

if [ ! -f "$KAGA_BUILD/index.html" ]; then
  echo "Missing KAGA V2 production build: $KAGA_BUILD" >&2
  exit 1
fi

mkdir -p "$KAGA_DELIVERABLES"

KAGA_CLIENT="$KAGA_STAGE/KAGA-V2-Executive-Presentation"
mkdir -p "$KAGA_CLIENT/app"
rsync -a \
  --exclude 'kaga/spatial-v2/' \
  --exclude 'visual-direction/' \
  --exclude 'specifications/' \
  "$KAGA_BUILD/" "$KAGA_CLIENT/app/"
rsync -a "$KAGA_ROOT/scripts/kaga-v2/client/README_AR.md" "$KAGA_CLIENT/README_AR.md"
rsync -a "$KAGA_ROOT/scripts/kaga-v2/client/START_KAGA.command" "$KAGA_CLIENT/START_KAGA.command"
rsync -a "$KAGA_ROOT/scripts/kaga-v2/client/START_KAGA_WINDOWS.bat" "$KAGA_CLIENT/START_KAGA_WINDOWS.bat"
chmod +x "$KAGA_CLIENT/START_KAGA.command"

if [ -d "$KAGA_CLIENT/app/kaga/spatial-v2" ]; then
  echo "Client package contains frozen raw spatial extraction." >&2
  exit 1
fi
if [ -d "$KAGA_CLIENT/app/visual-direction" ] || [ -d "$KAGA_CLIENT/app/specifications" ]; then
  echo "Client package contains internal visual-direction or specification artifacts." >&2
  exit 1
fi
if find "$KAGA_CLIENT" -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.test.*' -o -name '*.3dm' \) -print -quit | grep -q .; then
  echo "Client package contains a forbidden source, test, or Rhino file." >&2
  exit 1
fi
if [ ! -f "$KAGA_CLIENT/app/kaga/source/Rev06-King-Abdullah-Gardens-Inauguration.pdf" ]; then
  echo "Client package is missing the authoritative PDF used by the original-document action." >&2
  exit 1
fi

KAGA_CLIENT_ZIP="$KAGA_STAGE/KAGA-V2-Executive-Presentation.zip"
(cd "$KAGA_STAGE" && zip -q -r -X "$KAGA_CLIENT_ZIP" "KAGA-V2-Executive-Presentation")
rsync -a "$KAGA_CLIENT_ZIP" "$KAGA_DELIVERABLES/KAGA-V2-Executive-Presentation.zip"

KAGA_DEVELOPER="$KAGA_STAGE/KAGA-V2-Final-Developer-Archive"
mkdir -p "$KAGA_DEVELOPER/public" "$KAGA_DEVELOPER/tests/e2e" "$KAGA_DEVELOPER/reports" "$KAGA_DEVELOPER/docs" "$KAGA_DEVELOPER/scripts"
rsync -a "$KAGA_ROOT/src" "$KAGA_DEVELOPER/"
rsync -a "$KAGA_ROOT/public/kaga" "$KAGA_DEVELOPER/public/"
rsync -a "$KAGA_ROOT/scripts/kaga-v2" "$KAGA_DEVELOPER/scripts/"
rsync -a "$KAGA_ROOT/reports/v2-final" "$KAGA_DEVELOPER/reports/"
rsync -a "$KAGA_ROOT/tests/e2e/"kaga*.spec.ts "$KAGA_DEVELOPER/tests/e2e/"

for KAGA_DOC in \
  GARDEN_SPATIAL_REGISTRATION.md \
  KAGA_V1_FINAL_BASELINE.md \
  KAGA_V2_THEME.md \
  KNOWLEDGE_INTEGRATION_MATRIX.md \
  KNOWLEDGE_SOURCE_AUDIT.md \
  ROUTE_REGISTRATION.md \
  ROUTE_REGISTRATION_FINAL_STATUS.md \
  SOURCE_MAPPING.md \
  SPATIAL_SOURCE_AUDIT.md \
  SPATIAL_VALIDATION_V2.md; do
  rsync -a "$KAGA_ROOT/docs/$KAGA_DOC" "$KAGA_DEVELOPER/docs/$KAGA_DOC"
done

for KAGA_FILE in \
  AGENTS.md \
  index.html \
  package.json \
  pnpm-lock.yaml \
  eslint.config.js \
  playwright.config.ts \
  tsconfig.json \
  tsconfig.app.json \
  tsconfig.node.json \
  vite.config.ts \
  vitest.config.ts; do
  if [ -f "$KAGA_ROOT/$KAGA_FILE" ]; then
    rsync -a "$KAGA_ROOT/$KAGA_FILE" "$KAGA_DEVELOPER/$KAGA_FILE"
  fi
done
rsync -a "$KAGA_ROOT/scripts/kaga-v2/DEVELOPER_ARCHIVE_README.md" "$KAGA_DEVELOPER/README.md"

if find "$KAGA_DEVELOPER" -type f -name '*.3dm' -print -quit | grep -q .; then
  echo "Developer archive unexpectedly contains the original Rhino file." >&2
  exit 1
fi

KAGA_DEVELOPER_ZIP="$KAGA_STAGE/KAGA-V2-Final-Developer-Archive.zip"
(cd "$KAGA_STAGE" && zip -q -r -X "$KAGA_DEVELOPER_ZIP" "KAGA-V2-Final-Developer-Archive")
rsync -a "$KAGA_DEVELOPER_ZIP" "$KAGA_DELIVERABLES/KAGA-V2-Final-Developer-Archive.zip"

echo "$KAGA_DELIVERABLES/KAGA-V2-Executive-Presentation.zip"
echo "$KAGA_DELIVERABLES/KAGA-V2-Final-Developer-Archive.zip"
