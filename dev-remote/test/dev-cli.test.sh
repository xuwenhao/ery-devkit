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

assert_fails_without_ssh() {
    local expected="$1"
    shift
    : >"$DEV_TEST_SSH_ARGS"
    if "$@" >"$TMPDIR/command.out" 2>&1; then
        printf 'Expected command to fail: %s\n' "$*" >&2
        exit 1
    fi
    if ! grep -Fq "$expected" "$TMPDIR/command.out"; then
        printf 'Expected failure output to contain:\n%s\n\nActual output:\n' "$expected" >&2
        cat "$TMPDIR/command.out" >&2
        exit 1
    fi
    if [[ -s "$DEV_TEST_SSH_ARGS" ]]; then
        printf 'Expected failure before ssh, got args:\n' >&2
        cat "$DEV_TEST_SSH_ARGS" >&2
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

expected_tmux_args() {
    local path="$1"
    local remote_path="$2"
    local host="${3:-ai-series}"
    local name="${4:-}"
    local session="dev-host-$(session_slug "$path")"
    [[ -n "$name" ]] && session="$session-${name//[^[:alnum:]_-]/_}"
    printf -- '-t\n%s\nif command -v tmux >/dev/null 2>&1; then exec tmux new-session -A -s '\''%s'\'' -c %s; else cd %s || exit; echo '\''tmux not found on remote host; falling back to direct shell'\'' >&2; exec zsh -l || exec bash -l; fi' \
        "$host" "$session" "$remote_path" "$remote_path"
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

"$DEV" tmux
assert_args "$(expected_tmux_args '~/Codebase' "$remote_codebase")"

"$DEV" tmux --host hfmac '~/Codebase/personal/dotfiles'
assert_args "$(expected_tmux_args '~/Codebase/personal/dotfiles' "$remote_dotfiles" hfmac)"

"$DEV" tmux --host=hfmac '~/Codebase/personal/dotfiles'
assert_args "$(expected_tmux_args '~/Codebase/personal/dotfiles' "$remote_dotfiles" hfmac)"

# Read-only tmux subcommands and all following args are passed through without
# allocating a tty.
"$DEV" tmux ls
assert_args $'ai-series\ntmux '\''ls'\'''

# Destructive commands fail closed without a local interactive terminal.
assert_fails_without_ssh \
    'Refusing destructive tmux command without interactive confirmation.' \
    "$DEV" tmux kill-session -t foo

# --force is a dev option before the native tmux subcommand.
"$DEV" tmux --host hfmac --force kill-session -t foo
assert_args $'hfmac\ntmux '\''kill-session'\'' '\''-t'\'' '\''foo'\'''

assert_fails_without_ssh \
    'Refusing destructive tmux command without interactive confirmation.' \
    "$DEV" tmux kill-server

"$DEV" tmux -f kill-server
assert_args $'ai-series\ntmux '\''kill-server'\'''

"$DEV" tmux --host hfmac ls
assert_args $'hfmac\ntmux '\''ls'\'''

"$DEV" tmux -- ls -F '#{session_name}'
assert_args $'ai-series\ntmux '\''ls'\'' '\''-F'\'' '\''#{session_name}'\'''

# Raw passthrough does not bypass destructive-command confirmation.
assert_fails_without_ssh \
    'Refusing destructive tmux command without interactive confirmation.' \
    "$DEV" tmux -- kill-session -t raw

assert_fails_without_ssh \
    'Refusing destructive tmux command without interactive confirmation.' \
    "$DEV" tmux -- -L dev-socket kill-server

assert_fails_without_ssh \
    'Refusing destructive tmux command without interactive confirmation.' \
    "$DEV" tmux -- ls ';' kill-server

assert_fails_without_ssh \
    'Refusing destructive tmux command without interactive confirmation.' \
    "$DEV" tmux -- ls ';' -L dev-socket kill-server

# A session whose name matches a destructive command is still a read-only query.
"$DEV" tmux -- has-session -t kill-server
assert_args $'ai-series\ntmux '\''has-session'\'' '\''-t'\'' '\''kill-server'\'''

"$DEV" tmux --force -- kill-session -t raw
assert_args $'ai-series\ntmux '\''kill-session'\'' '\''-t'\'' '\''raw'\'''

tmux_help="$("$DEV" tmux --help)"
grep -Fq 'kill-session -t <name>         Kill one session; asks for confirmation' <<<"$tmux_help"
grep -Fq -- '-f, --force                    Skip destructive-command confirmation' <<<"$tmux_help"

# A path still uses attach-or-create with a tty and the existing session slug.
"$DEV" tmux "$HOME/Codebase"
assert_args "$(expected_tmux_args '~/Codebase' "$remote_codebase")"

# --name suffixes the session so one path can host several sessions.
"$DEV" tmux --name review
assert_args "$(expected_tmux_args '~/Codebase' "$remote_codebase" ai-series review)"

"$DEV" tmux --name=scratch '~/Codebase/personal/dotfiles'
assert_args "$(expected_tmux_args '~/Codebase/personal/dotfiles' "$remote_dotfiles" ai-series scratch)"

# A bare path with --name still defaults the host to ai-series, and the name
# is sanitized to tmux-safe chars (slash -> underscore).
"$DEV" tmux --host hfmac --name 'feat/x' '~/Codebase/personal/dotfiles'
assert_args "$(expected_tmux_args '~/Codebase/personal/dotfiles' "$remote_dotfiles" hfmac 'feat/x')"

# Same path, different --name -> distinct sessions.
"$DEV" tmux --name one
name_one_args="$(cat "$DEV_TEST_SSH_ARGS")"
"$DEV" tmux --name two
name_two_args="$(cat "$DEV_TEST_SSH_ARGS")"
if [[ "$name_one_args" == "$name_two_args" ]]; then
    printf 'Expected distinct session args for different --name values\n' >&2
    exit 1
fi

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
