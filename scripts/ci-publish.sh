#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

PUBLIC_PACKAGES=(
  packages/roc-db
  packages/@roc-db/in-memory
  packages/@roc-db/indexed-db
  packages/@roc-db/postgres
  packages/@roc-db/test-utils
  packages/@roc-db/valdres
)

# Restore prepacked package.json files even if the script aborts midway.
restore_packages() {
  for dir in "${PUBLIC_PACKAGES[@]}"; do
    (cd "$ROOT_DIR/$dir" && bun run "$SCRIPT_DIR/postpublish.ts" 2>/dev/null) || true
  done
}
trap restore_packages EXIT

# Sanity-check that `bunx changeset` resolves before doing any work — catches
# missing-binary regressions on PR before they reach the real publish flow.
bunx changeset --help > /dev/null

# Prepack all public packages (rewrite package.json exports for dist)
for dir in "${PUBLIC_PACKAGES[@]}"; do
  echo "Prepacking $dir..."
  (cd "$ROOT_DIR/$dir" && bun run "$SCRIPT_DIR/prepack.ts")
done

# DRY_RUN=1 skips the actual publish but still exercises bunx + changeset
# resolution and prepack/postpublish so PRs catch orchestration bugs.
if [ "${DRY_RUN:-0}" = "1" ]; then
  echo "DRY_RUN=1: skipping 'changeset publish'"
else
  bunx changeset publish
fi
