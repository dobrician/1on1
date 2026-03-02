#!/usr/bin/env bash
set -euo pipefail

# Sync docs/wiki/*.md to the GitHub Wiki git repo.
# Requires: git push access to dobrician/1on1.wiki.git
# (SSH key or PAT — the gh CLI OAuth token does NOT work for wiki repos)

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WIKI_DIR="$REPO_ROOT/docs/wiki"
TMP_DIR="$(mktemp -d)"
WIKI_URL="${WIKI_GIT_URL:-https://github.com/dobrician/1on1.wiki.git}"

cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT

echo "Cloning wiki repo..."
git clone "$WIKI_URL" "$TMP_DIR/wiki"

echo "Copying wiki pages..."
cp "$WIKI_DIR"/*.md "$TMP_DIR/wiki/"

cd "$TMP_DIR/wiki"
git add -A

if git diff --cached --quiet; then
  echo "Wiki is already up to date."
  exit 0
fi

git commit -m "Sync wiki from main repo ($(date -u +%Y-%m-%dT%H:%M:%SZ))"
git push
echo "Wiki synced successfully."
