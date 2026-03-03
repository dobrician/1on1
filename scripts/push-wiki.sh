#!/usr/bin/env bash
set -euo pipefail

# Fast wiki push: copies docs/wiki/*.md to the GitHub wiki repo and pushes changes.
# Used by Claude Code hooks to keep the wiki in sync as sprint progress is updated.
#
# Usage: ./scripts/push-wiki.sh

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WIKI_DIR="$REPO_ROOT/docs/wiki"
TMP_DIR="$(mktemp -d)"
WIKI_URL="${WIKI_GIT_URL:-https://github.com/dobrician/1on1.wiki.git}"

cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT

git clone --quiet --depth 1 "$WIKI_URL" "$TMP_DIR/wiki" 2>/dev/null

cp "$WIKI_DIR"/*.md "$TMP_DIR/wiki/"

cd "$TMP_DIR/wiki"
git add -A

if git diff --cached --quiet; then
    echo "wiki: already up to date"
    exit 0
fi

git commit --quiet -m "Update sprint progress ($(date -u +%Y-%m-%dT%H:%M:%SZ))"
git push --quiet
echo "wiki: pushed updates"
