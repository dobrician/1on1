#!/usr/bin/env bash
# Claude Code PostToolUse hook: after a git commit, check whether CHANGELOG.md
# was included.  If not, remind Claude to update it.
#
# Receives tool input as JSON on stdin.

input=$(cat)
command=$(echo "$input" | jq -r '.tool_input.command // empty')

# Only act on git commit commands
if [[ "$command" =~ git\ commit ]]; then
    changed=$(git diff-tree --no-commit-id --name-only -r HEAD 2>/dev/null \
              | grep -c "CHANGELOG.md" || true)
    if [[ "$changed" -eq 0 ]]; then
        echo "CHANGELOG not updated. Update CHANGELOG.md with the changes from this commit, then amend or create a follow-up commit."
    fi
fi

exit 0
