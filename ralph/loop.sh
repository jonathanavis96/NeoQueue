#!/usr/bin/env bash
# Thin wrapper - delegates to brain's loop.sh
# This keeps the single source of truth in brain/ralph/loop.sh
set -euo pipefail

# Find project root: try git first, fall back to script directory
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || \
  PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)" || \
  PROJECT_ROOT="$(pwd)"

# Find brain directory (configurable via env var, defaults to sibling directory)
BRAIN_ROOT="${BRAIN_ROOT:-$PROJECT_ROOT/../brain}"

# Verify brain directory exists
if [[ ! -d "$BRAIN_ROOT/ralph" ]]; then
  echo "ERROR: Brain repository not found at: $BRAIN_ROOT"
  echo ""
  echo "Options:"
  echo "  1. Clone brain repo as sibling: git clone <brain-repo> ../brain"
  echo "  2. Set BRAIN_ROOT env var: BRAIN_ROOT=/path/to/brain ./loop.sh"
  exit 1
fi

# Verify brain entrypoint is present and executable
BRAIN_LOOP="$BRAIN_ROOT/ralph/loop.sh"
if [[ ! -x "$BRAIN_LOOP" ]]; then
  echo "ERROR: Brain loop script missing or not executable: $BRAIN_LOOP"
  echo ""
  echo "Fix with:"
  echo "  chmod +x $BRAIN_LOOP"
  echo "Or set BRAIN_ROOT to correct location:"
  echo "  BRAIN_ROOT=/path/to/brain ./loop.sh"
  exit 1
fi

# Export brain repo for commit trailers (can be overridden)
export BRAIN_REPO="${BRAIN_REPO:-jonathanavis96/brain}"

# Delegate to brain's loop.sh with project context
export RALPH_PROJECT_ROOT="$PROJECT_ROOT"
exec "$BRAIN_LOOP" "$@"
