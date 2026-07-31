#!/usr/bin/env bash
# Génère/met à jour les références visuelles Linux (celles utilisées par la CI),
# dans le même conteneur Playwright que le workflow. À lancer après un changement
# de design assumé, en complément de `npm run test:visual:update` (références macOS).
#
# Prérequis : Docker en cours d'exécution.
# Usage : ./scripts/update-visual-linux.sh
set -euo pipefail

IMAGE="mcr.microsoft.com/playwright:v1.62.1-noble"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "→ Construction de Storybook + mise à jour des références Linux dans $IMAGE"
docker run --rm -t \
  -v "$ROOT":/work -w /work \
  "$IMAGE" \
  bash -c "npm ci && STORYBOOK_DISABLE_TELEMETRY=1 npm run build-storybook && npm run test:visual:update"

echo "✓ Références Linux mises à jour. Vérifie puis committe les *-linux.png générés."
