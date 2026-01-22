#!/usr/bin/env bash
set -euo pipefail

# PR Batch Creator - Promotes work branch to main via PR
# 
# Usage:
#   pr-batch.sh                    # Create PR from work branch -> main
#   pr-batch.sh --weekly           # Create time-based branch then PR
#   pr-batch.sh --snapshot "name"  # Create named snapshot branch then PR
#   pr-batch.sh --status           # Show pending changes without creating PR
#   pr-batch.sh --setup            # Initial setup: create work branch

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Work branch - replaced by new-project.sh during scaffolding
WORK_BRANCH="NeoQueue-work"
MAIN_BRANCH="main"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

usage() {
    cat <<EOF
PR Batch Creator - Promote $WORK_BRANCH to main via Pull Request

Usage:
  pr-batch.sh [OPTIONS]

Options:
  (none)              Create PR directly from $WORK_BRANCH -> main
  --weekly            Create time-based branch (ralph/YYYY-WNN) then PR to main
  --snapshot "name"   Create named snapshot branch (ralph/name) then PR to main
  --status            Show pending changes without creating PR
  --setup             Initial setup: create $WORK_BRANCH branch from main
  --help              Show this help

Examples:
  # See what's pending
  pr-batch.sh --status

  # One-time setup (creates $WORK_BRANCH branch)
  pr-batch.sh --setup

  # Create a PR with all accumulated work
  pr-batch.sh

  # Create weekly snapshot PR
  pr-batch.sh --weekly

  # Create named milestone PR
  pr-batch.sh --snapshot "kb-overhaul"

Workflow:
  1. Ralph commits to $WORK_BRANCH branch (loop.sh auto-switches here)
  2. Work accumulates on $WORK_BRANCH
  3. When ready, run pr-batch.sh to create a PR
  4. Review and merge via GitHub
  5. $WORK_BRANCH continues from new main
EOF
}

# Check gh CLI is installed and authenticated
check_gh() {
    if ! command -v gh &> /dev/null; then
        echo -e "${RED}Error: GitHub CLI (gh) not installed${NC}"
        echo "Install with: sudo apt install gh"
        echo "Then run: gh auth login"
        exit 1
    fi
    
    if ! gh auth status &> /dev/null; then
        echo -e "${RED}Error: GitHub CLI not authenticated${NC}"
        echo "Run: gh auth login"
        exit 1
    fi
}

# Get commit count between branches
get_commit_count() {
    git rev-list --count "$MAIN_BRANCH".."$WORK_BRANCH" 2>/dev/null || echo "0"
}

# Get file change stats
get_file_stats() {
    local stats
    stats=$(git diff --stat "$MAIN_BRANCH".."$WORK_BRANCH" | tail -1)
    echo "$stats"
}

# Generate PR body with change summary
generate_pr_body() {
    local commit_count
    local file_stats
    local week_num
    
    commit_count=$(get_commit_count)
    file_stats=$(get_file_stats)
    week_num=$(date +%V)
    
    cat <<EOF
## Ralph Work Batch - $(date +"%b %d, %Y")

### Summary
- **$commit_count commits** since last merge
- $file_stats

### Changes by Category

EOF

    # Group changes by directory
    echo "**Knowledge Base (kb/):**"
    git diff --name-only "$MAIN_BRANCH".."$WORK_BRANCH" -- "ralph/skills/" 2>/dev/null | sed 's/^/- /' || echo "- No changes"
    echo ""
    
    echo "**Templates:**"
    git diff --name-only "$MAIN_BRANCH".."$WORK_BRANCH" -- "ralph/templates/" 2>/dev/null | sed 's/^/- /' || echo "- No changes"
    echo ""
    
    echo "**Scripts:**"
    git diff --name-only "$MAIN_BRANCH".."$WORK_BRANCH" -- "*.sh" 2>/dev/null | sed 's/^/- /' || echo "- No changes"
    echo ""
    
    echo "**References:**"
    git diff --name-only "$MAIN_BRANCH".."$WORK_BRANCH" -- "ralph/references/" 2>/dev/null | sed 's/^/- /' || echo "- No changes"
    echo ""
    
    echo "**Core Docs:**"
    git diff --name-only "$MAIN_BRANCH".."$WORK_BRANCH" -- "ralph/*.md" "README.md" 2>/dev/null | sed 's/^/- /' || echo "- No changes"
    echo ""

    echo "### Commit Log"
    echo '```'
    git log --oneline "$MAIN_BRANCH".."$WORK_BRANCH" | head -30
    local total
    total=$(get_commit_count)
    if [[ "$total" -gt 30 ]]; then
        echo "... and $((total - 30)) more commits"
    fi
    echo '```'
}

# Show status of pending changes
show_status() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}PR Batch Status${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    
    # Check if work branch exists
    if ! git show-ref --verify --quiet "refs/heads/$WORK_BRANCH"; then
        echo -e "${YELLOW}Branch '$WORK_BRANCH' does not exist.${NC}"
        echo "Run: pr-batch.sh --setup"
        return 1
    fi
    
    local commit_count
    commit_count=$(get_commit_count)
    
    if [[ "$commit_count" -eq 0 ]]; then
        echo -e "${GREEN}✓ No pending changes${NC}"
        echo "$WORK_BRANCH is up to date with main"
        return 0
    fi
    
    echo -e "${YELLOW}Pending changes: $commit_count commits${NC}"
    echo ""
    
    echo "Files changed:"
    git diff --stat "$MAIN_BRANCH".."$WORK_BRANCH" | head -20
    echo ""
    
    echo "Recent commits:"
    git log --oneline "$MAIN_BRANCH".."$WORK_BRANCH" | head -10
    echo ""
    
    echo -e "Run ${GREEN}pr-batch.sh${NC} to create a PR with these changes"
}

# Setup work branch
do_setup() {
    echo -e "${BLUE}Setting up $WORK_BRANCH branch...${NC}"
    
    if git show-ref --verify --quiet "refs/heads/$WORK_BRANCH"; then
        echo -e "${YELLOW}Branch '$WORK_BRANCH' already exists${NC}"
        read -p "Reset it to current main? (yes/no): " confirm
        if [[ "$confirm" != "yes" ]]; then
            echo "Setup cancelled"
            return 1
        fi
        git checkout main
        git branch -D "$WORK_BRANCH"
    fi
    
    git checkout -b "$WORK_BRANCH"
    git push -u origin "$WORK_BRANCH"
    
    echo ""
    echo -e "${GREEN}✓ Created and pushed '$WORK_BRANCH' branch${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Run ralph/loop.sh (it will auto-switch to '$WORK_BRANCH')"
    echo "2. When ready, run: pr-batch.sh"
}

# Create PR from work branch to main
create_pr() {
    local pr_branch="$1"
    local pr_title="$2"
    
    echo -e "${BLUE}Creating PR: $pr_title${NC}"
    echo ""
    
    # Generate PR body
    local pr_body
    pr_body=$(generate_pr_body)
    
    # If using a snapshot branch, create it first
    if [[ "$pr_branch" != "$WORK_BRANCH" ]]; then
        echo "Creating snapshot branch: $pr_branch"
        git checkout "$WORK_BRANCH"
        git checkout -b "$pr_branch"
        git push -u origin "$pr_branch"
    fi
    
    # Create the PR
    local pr_url
    pr_url=$(gh pr create \
        --base "$MAIN_BRANCH" \
        --head "$pr_branch" \
        --title "$pr_title" \
        --body "$pr_body")
    
    echo ""
    echo -e "${GREEN}✓ PR created successfully!${NC}"
    echo "$pr_url"
    echo ""
    
    # Return to work branch
    git checkout "$WORK_BRANCH"
}

# Main
MODE="direct"
SNAPSHOT_NAME=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --weekly)
            MODE="weekly"
            shift
            ;;
        --snapshot)
            MODE="snapshot"
            SNAPSHOT_NAME="${2:-}"
            if [[ -z "$SNAPSHOT_NAME" ]]; then
                echo -e "${RED}Error: --snapshot requires a name${NC}"
                exit 1
            fi
            shift 2
            ;;
        --status)
            MODE="status"
            shift
            ;;
        --setup)
            MODE="setup"
            shift
            ;;
        --help|-h)
            usage
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            usage
            exit 1
            ;;
    esac
done

# Execute based on mode
case "$MODE" in
    status)
        show_status
        ;;
    setup)
        do_setup
        ;;
    direct)
        check_gh
        
        commit_count=$(get_commit_count)
        if [[ "$commit_count" -eq 0 ]]; then
            echo -e "${GREEN}✓ No pending changes to create PR${NC}"
            exit 0
        fi
        
        create_pr "$WORK_BRANCH" "Ralph batch: $(date +%Y-%m-%d) ($commit_count commits)"
        ;;
    weekly)
        check_gh
        
        commit_count=$(get_commit_count)
        if [[ "$commit_count" -eq 0 ]]; then
            echo -e "${GREEN}✓ No pending changes to create PR${NC}"
            exit 0
        fi
        
        week_branch="ralph/$(date +%Y)-W$(date +%V)"
        create_pr "$week_branch" "Ralph weekly: Week $(date +%V), $(date +%Y) ($commit_count commits)"
        ;;
    snapshot)
        check_gh
        
        commit_count=$(get_commit_count)
        if [[ "$commit_count" -eq 0 ]]; then
            echo -e "${GREEN}✓ No pending changes to create PR${NC}"
            exit 0
        fi
        
        snapshot_branch="ralph/$SNAPSHOT_NAME"
        create_pr "$snapshot_branch" "Ralph: $SNAPSHOT_NAME ($commit_count commits)"
        ;;
esac
