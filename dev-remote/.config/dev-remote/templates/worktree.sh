#!/usr/bin/env bash
set -euo pipefail

# Generic worktree management script
# Creates worktrees at .worktrees/<name> on feature/<name> branch
# with optional tmux session auto-launch
#
# Repo-specific setup: create scripts/.worktree-setup.sh
# The hook is sourced after worktree creation with these variables:
#   WORKTREE_PATH  — absolute path to the new worktree
#   WORKTREE_NAME  — short name (e.g. "my-feature")
#   BRANCH_NAME    — branch name (e.g. "feature/my-feature")
#   REPO_ROOT      — root of the main worktree
#   NO_NODE        — true/false, controls frontend dependency install

# ── Color output helpers ──────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

info()   { echo -e "${GREEN}ℹ${NC} $*"; }
warn()   { echo -e "${YELLOW}⚠${NC} $*"; }
error()  { echo -e "${RED}✖${NC} $*" >&2; }
header() { echo -e "\n${BOLD}${BLUE}$*${NC}"; }

# ── Repo root check ──────────────────────────────────────────────────

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || {
    error "Not inside a git repository"
    exit 1
}
WORKTREE_DIR="${REPO_ROOT}/.worktrees"

# ── Global flags ─────────────────────────────────────────────────────

NO_TMUX=false
NO_NODE=true

# ── Global variables set before setup hook ───────────────────────────

WORKTREE_PATH=""
WORKTREE_NAME=""
BRANCH_NAME=""

# ── Usage ─────────────────────────────────────────────────────────────

usage() {
    cat <<EOF
Usage: $(basename "$0") [OPTIONS] [name]

Manage git worktrees for parallel development.

Arguments:
  name                    Create a new worktree with this name (branch: feature/<name>)

Options:
  -l, --list              List active worktrees
  -c, --check <name>      Run safety checks without removing (exit 1 if issues found)
  -r, --remove <name>     Remove a worktree (with safety checks)
  -f, --force             Skip safety checks when removing
      --no-tmux           Create/attach without launching tmux (prints path instead)
      --node              Install frontend dependencies (pnpm install) during setup
      --no-node           (default) Skip frontend dependencies during setup
  -h, --help              Show this help message

Examples:
  $(basename "$0") my-feature              # Create worktree + tmux session
  $(basename "$0") --node my-feature       # Create worktree + install frontend deps
  $(basename "$0") --no-tmux my-feature    # Create worktree, print path, no tmux
  $(basename "$0") --list                  # List all worktrees
  $(basename "$0") --remove my-feat        # Remove worktree (safe)
  $(basename "$0") --remove my-feat -f     # Remove worktree (skip checks)
EOF
}

# ── Helpers ───────────────────────────────────────────────────────────

# Check if a worktree exists for the given path using git's porcelain output
worktree_exists() {
    local path="$1"
    git worktree list --porcelain | grep -q "^worktree ${path}$"
}

# ── List ──────────────────────────────────────────────────────────────

list_worktrees() {
    header "Active worktrees"
    echo "─────────────────"
    git worktree list
}

# ── Check (safety only, no removal) ──────────────────────────────────

check_worktree() {
    local name="$1"
    local worktree_path="${WORKTREE_DIR}/${name}"
    local branch="feature/${name}"
    local issues=0

    if ! worktree_exists "$worktree_path"; then
        error "Worktree '${name}' not found at ${worktree_path}"
        exit 1
    fi

    # Check: uncommitted changes
    if [ -n "$(git -C "$worktree_path" status --porcelain 2>/dev/null)" ]; then
        warn "Worktree '${name}' has uncommitted changes."
        issues=$((issues + 1))
    fi

    # Check: unpushed commits
    if git show-ref --verify --quiet "refs/remotes/origin/${branch}" 2>/dev/null; then
        local unpushed
        unpushed=$(git log "origin/${branch}..${branch}" --oneline 2>/dev/null || true)
        if [ -n "$unpushed" ]; then
            warn "Branch '${branch}' has unpushed commits:"
            echo "$unpushed" | sed 's/^/  /'
            issues=$((issues + 1))
        fi
    fi

    # Check: unmerged branch with open PR
    if git branch --no-merged main 2>/dev/null | grep -q "$branch"; then
        warn "Branch '${branch}' has not been merged to main."

        if command -v gh &>/dev/null; then
            local pr_count
            pr_count=$(gh pr list --head "$branch" --state open --json number --jq 'length' 2>/dev/null || echo "0")
            local merged_count
            merged_count=$(gh pr list --head "$branch" --state merged --json number --jq 'length' 2>/dev/null || echo "0")

            if [ "$pr_count" != "0" ]; then
                warn "There is an open PR for branch '${branch}'."
                issues=$((issues + 1))
            elif [ "$merged_count" != "0" ]; then
                info "PR has been merged. Safe to remove."
            else
                warn "Branch '${branch}' has no PR (open or merged)."
                issues=$((issues + 1))
            fi
        else
            warn "gh CLI not available — cannot verify PR merge status."
            issues=$((issues + 1))
        fi
    fi

    if [ "$issues" -gt 0 ]; then
        exit 1
    fi
    info "All safety checks passed for '${name}'."
}

# ── Remove ────────────────────────────────────────────────────────────

remove_worktree() {
    local name="$1"
    local force="${2:-false}"
    local worktree_path="${WORKTREE_DIR}/${name}"
    local branch="feature/${name}"

    if ! worktree_exists "$worktree_path"; then
        error "Worktree '${name}' not found at ${worktree_path}"
        exit 1
    fi

    if [ "$force" != "true" ]; then
        # Safety check: uncommitted changes
        if [ -n "$(git -C "$worktree_path" status --porcelain 2>/dev/null)" ]; then
            error "Worktree '${name}' has uncommitted changes."
            echo "  Use --force to remove anyway, or commit/stash your changes first."
            exit 1
        fi

        # Safety check: unpushed commits
        if git show-ref --verify --quiet "refs/remotes/origin/${branch}" 2>/dev/null; then
            local unpushed
            unpushed=$(git log "origin/${branch}..${branch}" --oneline 2>/dev/null || true)
            if [ -n "$unpushed" ]; then
                warn "Branch '${branch}' has unpushed commits:"
                echo "$unpushed" | sed 's/^/  /'
                echo "  Use --force to remove anyway, or push your changes first."
                exit 1
            fi
        fi

        # Safety check: unmerged branch with open PR
        if git branch --no-merged main 2>/dev/null | grep -q "$branch"; then
            warn "Branch '${branch}' has not been merged to main."

            if command -v gh &>/dev/null; then
                local pr_count
                pr_count=$(gh pr list --head "$branch" --state open --json number --jq 'length' 2>/dev/null || echo "0")
                if [ "$pr_count" != "0" ]; then
                    error "There is an open PR for branch '${branch}'."
                    echo "  Use --force to remove anyway, or merge the PR first."
                    exit 1
                fi

                local merged_count
                merged_count=$(gh pr list --head "$branch" --state merged --json number --jq 'length' 2>/dev/null || echo "0")
                if [ "$merged_count" != "0" ]; then
                    info "PR has been merged. Safe to remove."
                else
                    error "Branch '${branch}' is unmerged and has no PR."
                    echo "  Use --force to remove anyway, or create a PR first."
                    exit 1
                fi
            else
                warn "Install gh CLI for PR merge safety checks."
                echo "  Use --force to remove anyway."
                exit 1
            fi
        fi
    fi

    # Kill tmux session if it exists
    if command -v tmux &>/dev/null; then
        tmux kill-session -t "$name" 2>/dev/null || true
    fi

    info "Removing worktree '${name}'..."
    git worktree remove "$worktree_path" --force
    git branch -d "$branch" 2>/dev/null || git branch -D "$branch" 2>/dev/null || true
    git worktree prune

    # Offer to clean up remote branch
    if git show-ref --verify --quiet "refs/remotes/origin/${branch}" 2>/dev/null; then
        if [ "$force" = "true" ]; then
            info "Deleting remote branch 'origin/${branch}'..."
            git push origin --delete "$branch" 2>/dev/null || true
        else
            echo ""
            read -rp "Delete remote branch 'origin/${branch}'? [y/N] " confirm
            if [[ "$confirm" =~ ^[Yy]$ ]]; then
                git push origin --delete "$branch" 2>/dev/null || true
                info "Remote branch deleted."
            fi
        fi
    fi

    info "Worktree '${name}' removed."
}

# ── Setup (hook-based) ───────────────────────────────────────────────

run_setup_hook() {
    local hook="${REPO_ROOT}/scripts/.worktree-setup.sh"
    if [ -f "$hook" ]; then
        header "Running repo-specific setup..."
        # shellcheck disable=SC1090
        source "$hook"
    else
        info "No scripts/.worktree-setup.sh found — skipping repo-specific setup"
    fi
}

# ── Create ────────────────────────────────────────────────────────────

create_worktree() {
    local name="$1"
    local worktree_path="${WORKTREE_DIR}/${name}"
    local branch="feature/${name}"

    # Set globals for setup hook
    WORKTREE_NAME="$name"
    BRANCH_NAME="$branch"
    WORKTREE_PATH="$worktree_path"

    # If worktree already exists, attach or print path
    if worktree_exists "$worktree_path"; then
        if [ "$NO_TMUX" = true ]; then
            info "Worktree '${name}' already exists."
            echo "$worktree_path"
            return
        fi
        info "Worktree '${name}' already exists at ${worktree_path}"
        info "Attaching to existing tmux session..."
        if command -v tmux &>/dev/null; then
            tmux attach-session -t "$name" 2>/dev/null || exec tmux new-session -s "$name" -c "$worktree_path"
        else
            warn "tmux not available. cd to: ${worktree_path}"
        fi
        return
    fi

    mkdir -p "$WORKTREE_DIR"

    # Smart branch detection: local → remote → create new
    if git show-ref --verify --quiet "refs/heads/${branch}" 2>/dev/null; then
        # Local branch exists, create worktree using it
        info "Using existing local branch '${branch}'"
        git worktree add "$worktree_path" "$branch"
    elif git show-ref --verify --quiet "refs/remotes/origin/${branch}" 2>/dev/null; then
        # Remote branch exists, create worktree tracking it
        info "Using remote branch 'origin/${branch}'"
        git worktree add --track -b "$branch" "$worktree_path" "origin/${branch}"
    else
        # No existing branch, create new from main
        info "Creating new branch '${branch}' from main"
        git worktree add -b "$branch" "$worktree_path" main
    fi

    run_setup_hook

    header "Ready!"
    echo "  Worktree: ${worktree_path}"
    echo "  Branch:   ${branch}"
    echo ""

    if [ "$NO_TMUX" = true ]; then
        echo "$worktree_path"
        return
    fi

    # Launch tmux session in the worktree directory
    if command -v tmux &>/dev/null; then
        info "Launching tmux session '${name}'..."
        exec tmux new-session -s "$name" -c "$worktree_path"
    else
        warn "tmux not available. cd to: ${worktree_path}"
    fi
}

# ── Argument parsing ─────────────────────────────────────────────────

# Pre-parse --no-tmux from anywhere in args
ARGS=()
for arg in "$@"; do
    if [ "$arg" = "--no-tmux" ]; then
        NO_TMUX=true
    elif [ "$arg" = "--node" ]; then
        NO_NODE=false
    elif [ "$arg" = "--no-node" ]; then
        NO_NODE=true
    else
        ARGS+=("$arg")
    fi
done
set -- "${ARGS[@]+"${ARGS[@]}"}"

FORCE=false
ACTION=""
NAME=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        -l|--list)
            ACTION="list"
            shift
            ;;
        -c|--check)
            ACTION="check"
            NAME="${2:-}"
            shift 2 || { error "--check requires a name"; exit 1; }
            ;;
        -r|--remove)
            ACTION="remove"
            NAME="${2:-}"
            shift 2 || { error "--remove requires a name"; exit 1; }
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        -*)
            error "Unknown option: $1"
            usage
            exit 1
            ;;
        *)
            if [ -z "$ACTION" ]; then
                ACTION="create"
                NAME="$1"
            fi
            shift
            ;;
    esac
done

case "$ACTION" in
    list)
        list_worktrees
        ;;
    check)
        if [ -z "$NAME" ]; then
            error "--check requires a name"
            exit 1
        fi
        check_worktree "$NAME"
        ;;
    remove)
        if [ -z "$NAME" ]; then
            error "--remove requires a name"
            exit 1
        fi
        remove_worktree "$NAME" "$FORCE"
        ;;
    create)
        if [ -z "$NAME" ]; then
            error "Please provide a worktree name"
            usage
            exit 1
        fi
        create_worktree "$NAME"
        ;;
    *)
        usage
        exit 1
        ;;
esac
