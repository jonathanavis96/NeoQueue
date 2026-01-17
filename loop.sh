#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RALPH="$ROOT/ralph"
LOGDIR="$RALPH/logs"
mkdir -p "$LOGDIR"

# Interrupt handling: First Ctrl+C = graceful exit, Second Ctrl+C = immediate exit
INTERRUPT_COUNT=0
INTERRUPT_RECEIVED=false

# Cleanup function for temp files
cleanup() {
  if [[ -n "${TEMP_CONFIG:-}" && -f "${TEMP_CONFIG:-}" ]]; then
    rm -f "$TEMP_CONFIG"
  fi
}

handle_interrupt() {
  INTERRUPT_COUNT=$((INTERRUPT_COUNT + 1))
  
  if [[ $INTERRUPT_COUNT -eq 1 ]]; then
    echo ""
    echo "========================================"
    echo "⚠️  Interrupt received!"
    echo "Will exit after current iteration completes."
    echo "Press Ctrl+C again to force immediate exit."
    echo "========================================"
    INTERRUPT_RECEIVED=true
  else
    echo ""
    echo "========================================"
    echo "🛑 Force exit!"
    echo "========================================"
    cleanup
    kill 0
    exit 130
  fi
}

trap 'handle_interrupt' INT TERM
trap 'cleanup' EXIT

usage() {
  cat <<'EOF'
Usage:
  loop.sh [--prompt <path>] [--iterations N] [--plan-every N] [--yolo|--no-yolo]
          [--model <model>]

Defaults:
  --iterations 1
  --plan-every 3
  --model       Uses default from ~/.rovodev/config.yml
  If --prompt is NOT provided, loop alternates:
    - PLAN on iteration 1 and every N iterations
    - BUILD otherwise
  If --prompt IS provided, that prompt is used for all iterations.

Model Selection:
  --model <model>  Specify the model to use. Shortcuts available:
                   opus    -> anthropic.claude-opus-4-5-20251101-v1:0
                   sonnet  -> anthropic.claude-sonnet-4-20250514-v1:0
                   Or provide a full model ID directly.

Examples:
  # Run BUILD once (from anywhere)
  bash ralph/loop.sh --prompt ralph/PROMPT_build.md --iterations 1 --plan-every 999

  # From inside ralph/
  bash ./loop.sh --prompt ./PROMPT_build.md --iterations 1 --plan-every 999

  # Alternate plan/build for 10 iters, plan every 3
  bash ralph/loop.sh --iterations 10 --plan-every 3
  
  # Use Sonnet model for faster iterations
  bash ralph/loop.sh --model sonnet --iterations 20 --plan-every 5
  
  # Use Opus for careful planning
  bash ralph/loop.sh --model opus --iterations 1
EOF
}

# Defaults
ITERATIONS=1
PLAN_EVERY=3
YOLO_FLAG="--yolo"
PROMPT_ARG=""
MODEL_ARG=""

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --prompt)
      PROMPT_ARG="${2:-}"; shift 2 ;;
    --iterations)
      ITERATIONS="${2:-}"; shift 2 ;;
    --plan-every)
      PLAN_EVERY="${2:-}"; shift 2 ;;
    --yolo)
      YOLO_FLAG="--yolo"; shift ;;
    --no-yolo)
      YOLO_FLAG=""; shift ;;
    --model)
      MODEL_ARG="${2:-}"; shift 2 ;;
    -h|--help)
      usage; exit 0 ;;
    *)
      echo "Unknown arg: $1" >&2
      usage; exit 2 ;;
  esac
done

# Resolve model shortcut to full model ID
resolve_model() {
  local model="$1"
  case "$model" in
    opus)
      echo "anthropic.claude-opus-4-5-20251101-v1:0" ;;
    sonnet)
      echo "anthropic.claude-sonnet-4-20250514-v1:0" ;;
    *)
      echo "$model" ;;
  esac
}

# Setup model config if specified
CONFIG_FLAG=""
TEMP_CONFIG=""
if [[ -n "$MODEL_ARG" ]]; then
  RESOLVED_MODEL="$(resolve_model "$MODEL_ARG")"
  TEMP_CONFIG="/tmp/rovodev_config_$$_$(date +%s).yml"
  
  # Copy base config and override modelId
  if [[ -f "$HOME/.rovodev/config.yml" ]]; then
    # Use sed to replace modelId in a copy of the config
    sed "s|^  modelId:.*|  modelId: $RESOLVED_MODEL|" "$HOME/.rovodev/config.yml" > "$TEMP_CONFIG"
  else
    # Create minimal config with just the model
    cat > "$TEMP_CONFIG" <<EOF
version: 1
agent:
  modelId: $RESOLVED_MODEL
EOF
  fi
  CONFIG_FLAG="--config-file $TEMP_CONFIG"
  echo "Using model: $RESOLVED_MODEL"
fi

# Resolve a prompt path robustly (works from repo root or ralph/)
resolve_prompt() {
  local p="$1"
  if [[ -z "$p" ]]; then return 1; fi

  # 1) As provided (relative to current working directory)
  if [[ -f "$p" ]]; then
    realpath "$p"
    return 0
  fi

  # 2) Relative to repo root
  if [[ -f "$ROOT/$p" ]]; then
    realpath "$ROOT/$p"
    return 0
  fi

  echo "Prompt not found: $p (checked: '$p' and '$ROOT/$p')" >&2
  return 1
}

# Ralph determines mode from iteration number (PROMPT.md has conditional logic)
PLAN_PROMPT="$RALPH/PROMPT.md"
BUILD_PROMPT="$RALPH/PROMPT.md"

run_once() {
  local prompt_file="$1"
  local phase="$2"
  local iter="$3"

  local ts
  ts="$(date +%F_%H%M%S)"
  local log="$LOGDIR/${ts}_iter${iter}_${phase}.log"

  echo
  echo "========================================"
  echo "Ralph Loop"
  echo "Root: $ROOT"
  echo "Iteration: $iter / $ITERATIONS"
  echo "Phase: $phase"
  echo "Prompt: $prompt_file"
  echo "Log: $log"
  echo "========================================"
  echo

  # Create temporary prompt with mode prepended
  local prompt_with_mode="/tmp/rovodev_prompt_with_mode_$$_${iter}.md"
  {
    echo "# MODE: ${phase^^}"
    echo ""
    cat "$prompt_file"
  } > "$prompt_with_mode"

  # Feed prompt into RovoDev
  script -q -c "cat \"$prompt_with_mode\" | acli rovodev run ${CONFIG_FLAG} ${YOLO_FLAG}" "$log"

  # Clean up temporary prompt
  rm -f "$prompt_with_mode"

  echo
  echo "Run complete."
  echo "Transcript: $log"
  
  # Check for completion sentinel (strip ANSI codes, require standalone line)
  # Only matches when sentinel appears alone on a line (not in validation/discussion)
  if sed 's/\x1b\[[0-9;]*m//g' "$log" | grep -qE '^\s*<promise>COMPLETE</promise>\s*$'; then
    echo ""
    echo "========================================"
    echo "🎉 Ralph signaled completion!"
    echo "All tasks in IMPLEMENTATION_PLAN.md done."
    echo "========================================"
    return 42  # Special return code for completion
  fi
  
  return 0
}

# Determine prompt strategy
if [[ -n "$PROMPT_ARG" ]]; then
  PROMPT_FILE="$(resolve_prompt "$PROMPT_ARG")"
  for ((i=1; i<=ITERATIONS; i++)); do
    # Check for interrupt before starting iteration
    if [[ "$INTERRUPT_RECEIVED" == "true" ]]; then
      echo ""
      echo "Exiting gracefully after iteration $((i-1))."
      exit 130
    fi
    
    run_once "$PROMPT_FILE" "custom" "$i"
    # Check if Ralph signaled completion
    if [[ $? -eq 42 ]]; then
      echo ""
      echo "Loop terminated early due to completion."
      break
    fi
  done
else
  # Alternating plan/build
  for ((i=1; i<=ITERATIONS; i++)); do
    # Check for interrupt before starting iteration
    if [[ "$INTERRUPT_RECEIVED" == "true" ]]; then
      echo ""
      echo "Exiting gracefully after iteration $((i-1))."
      exit 130
    fi
    
    if [[ "$i" -eq 1 ]] || (( PLAN_EVERY > 0 && ( (i-1) % PLAN_EVERY == 0 ) )); then
      run_once "$PLAN_PROMPT" "plan" "$i"
    else
      run_once "$BUILD_PROMPT" "build" "$i"
    fi
    # Check if Ralph signaled completion
    if [[ $? -eq 42 ]]; then
      echo ""
      echo "Loop terminated early due to completion."
      break
    fi
  done
fi
