#!/usr/bin/env bash
# Claude Code PostToolUse hook: sync wiki when docs/wiki/ files are edited.
# Receives tool input as JSON on stdin.

input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

if [[ "$file_path" =~ docs/wiki/.*\.md$ ]]; then
    /home/dc/work/1on1/scripts/push-wiki.sh
fi

exit 0
