#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEV="$ROOT/.local/bin/dev"
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

BIN="$TMPDIR/bin"
mkdir -p "$BIN"

cat >"$BIN/ssh" <<'SSH'
#!/usr/bin/env bash
printf '%s\n' "$@" >"$DEV_TEST_SSH_ARGS"
exit 0
SSH
chmod +x "$BIN/ssh"

PATH="$BIN:$PATH"
export DEV_TEST_SSH_ARGS="$TMPDIR/ssh.args"

assert_args() {
    local expected="$1"
    local actual
    actual="$(cat "$DEV_TEST_SSH_ARGS")"
    if [[ "$actual" != "$expected" ]]; then
        printf 'Expected args:\n%s\n\nActual args:\n%s\n' "$expected" "$actual" >&2
        exit 1
    fi
}

session_slug() {
    local original="$1"
    local path="$1"
    local hash
    [[ "$path" == "~/"* ]] && path="${path:2}"
    path="${path#/}"
    path="${path:-home}"
    if command -v shasum >/dev/null 2>&1; then
        hash="$(printf '%s' "$original" | shasum | awk '{print substr($1, 1, 8)}')"
    elif command -v sha1sum >/dev/null 2>&1; then
        hash="$(printf '%s' "$original" | sha1sum | awk '{print substr($1, 1, 8)}')"
    else
        hash="$(printf '%s' "$original" | cksum | awk '{print $1}')"
    fi
    printf '%s-%s' "${path//[^[:alnum:]._-]/_}" "$hash"
}

expected_agent_args() {
    local tool="$1"
    local path="$2"
    local remote_path="$3"
    local host="${4:-ai-series}"
    local session="dev-${tool}-$(session_slug "$path")"
    printf -- '-t\n%s\nif command -v tmux >/dev/null 2>&1; then exec tmux new-session -A -s '\''%s'\'' -c %s '\''zsh -lic "exec %s"'\''; else cd %s || exit; echo '\''tmux not found on remote host; falling back to direct %s'\'' >&2; exec zsh -lic '\''exec %s'\''; fi' \
        "$host" "$session" "$remote_path" "$tool" "$remote_path" "$tool" "$tool"
}

remote_codebase='"$HOME"/'\''Codebase'\'''
remote_dotfiles='"$HOME"/'\''Codebase/personal/dotfiles'\'''
remote_ecap_worktree='"$HOME"/'\''Codebase/srpone/zooclaw/ecap-workspace/.worktrees/foo'\'''

"$DEV" ssh
assert_args $'-t\nai-series'

"$DEV" ssh hfmac
assert_args $'-t\nhfmac'

"$DEV" codex
assert_args "$(expected_agent_args codex '~/Codebase' "$remote_codebase")"

"$DEV" codex '~/Codebase/personal/dotfiles'
assert_args "$(expected_agent_args codex '~/Codebase/personal/dotfiles' "$remote_dotfiles")"

"$DEV" codex --host hfmac '~/Codebase/personal/dotfiles'
assert_args "$(expected_agent_args codex '~/Codebase/personal/dotfiles' "$remote_dotfiles" hfmac)"

"$DEV" codex --host=hfmac '~/Codebase/personal/dotfiles'
assert_args "$(expected_agent_args codex '~/Codebase/personal/dotfiles' "$remote_dotfiles" hfmac)"

HOME="/Users/tester" "$DEV" codex /Users/tester/Codebase/personal/dotfiles
assert_args "$(expected_agent_args codex '~/Codebase/personal/dotfiles' "$remote_dotfiles")"

"$DEV" claude '~/Codebase/srpone/zooclaw/ecap-workspace/.worktrees/foo'
assert_args "$(expected_agent_args claude '~/Codebase/srpone/zooclaw/ecap-workspace/.worktrees/foo' "$remote_ecap_worktree")"

"$DEV" claude --host oci-dev2.ssh.buildagi.us '~/Codebase/srpone/zooclaw/ecap-workspace/.worktrees/foo'
assert_args "$(expected_agent_args claude '~/Codebase/srpone/zooclaw/ecap-workspace/.worktrees/foo' "$remote_ecap_worktree" oci-dev2.ssh.buildagi.us)"

"$DEV" codex '~/Codebase/foo/bar'
foo_bar_path_args="$(cat "$DEV_TEST_SSH_ARGS")"
"$DEV" codex '~/Codebase/foo_bar'
foo_bar_underscore_args="$(cat "$DEV_TEST_SSH_ARGS")"
if [[ "$foo_bar_path_args" == "$foo_bar_underscore_args" ]]; then
    printf 'Expected distinct session args for slash and underscore paths\n' >&2
    exit 1
fi

"$DEV" codex '~/Codebase/foo'
foo_no_slash_args="$(cat "$DEV_TEST_SSH_ARGS")"
"$DEV" codex '~/Codebase/foo/'
foo_trailing_slash_args="$(cat "$DEV_TEST_SSH_ARGS")"
if [[ "$foo_no_slash_args" != "$foo_trailing_slash_args" ]]; then
    printf 'Expected trailing slash path to reuse the same session args\n' >&2
    exit 1
fi
