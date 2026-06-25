# dev-remote

Connect from a local machine to a devcontainer running on a remote server, with tmux/dtach session management for parallel worktree-based development.

## What it does

- SSH into a remote host and `docker exec` into a devcontainer, detecting running containers automatically.
- Preserve terminal features (Kitty graphics protocol, CSI-u, 256 colors) across the SSH hop.
- Manage persistent sessions via `dtach` (default, preserves terminal protocols) or `tmux` (split panes, loses graphics protocol).
- Forward ports through SSH (`--ports`).
- Create/list/remove git worktrees on the remote, sharing build caches via a generic `worktree.sh` template.
- Auto-select profiles based on current working directory.

## Installation

With GNU Stow from the `ery-devkit` monorepo root:

```bash
stow --no-folding --dir=. --target="$HOME" dev-remote
```

Creates:
- `~/.local/bin/dev` — main CLI
- `~/.local/share/zsh/site-functions/_dev` — zsh completion
- `~/.config/dev-remote/example.conf` — profile template
- `~/.config/dev-remote/templates/worktree.sh` — generic worktree script deployed to remotes

## Configuration

Copy the example profile and edit:

```bash
cp ~/.config/dev-remote/example.conf ~/.config/dev-remote/default.conf
```

### Profile variables

| Variable | Required | Description |
| -------- | -------- | ----------- |
| `DEV_SSH_HOST` | yes | SSH host alias or `user@host` for the remote server |
| `DEV_CONTAINER_PATTERN` | yes | Substring match for the target container name (via `docker ps`) |
| `DEV_CONTAINER_USER` | yes | User inside the container (e.g. `node`, `vscode`) |
| `DEV_WORKSPACE` | yes | Absolute path to the project root inside the container |
| `DEV_FORWARD_PORTS` | no | Space-separated TCP ports to forward with `--ports` |
| `DEV_REMOTE_PROJECT_DIR` | no | Absolute path to the project checkout on the remote host. Enables auto-start via `docker compose`. |
| `DEV_LOCAL_PROJECT_DIR` | no | Space-separated absolute paths to local checkouts. When `dev` is invoked from inside one, this profile is auto-selected. |

### Profile resolution (first match wins)

1. `--profile <name>` flag
2. `$DEV_PROFILE` environment variable
3. `.dev-remote-profile` file in `$PWD` or any parent directory
4. Longest-prefix match of `$PWD` against `DEV_LOCAL_PROJECT_DIR` across all profiles
5. `default.conf` if it exists

Run `dev list` to see all profiles and which one would be auto-selected in the current directory.

## Usage

```
dev [--profile <name>] <command> [options]

Commands:
  ssh [host] [options]        SSH to a host shell (default: ai-series)
  connect [name] [options]    Connect to a worktree session (default: "main")
  status                      Show container status, worktrees, tmux sessions
  sync                        Pull latest main branch on remote
  worktree <name>             Create worktree + connect
  worktree --list             List remote worktrees
  worktree --remove <name>    Remove remote worktree (safety checks)
  scaffold worktree           Deploy templates/worktree.sh to remote repo
  list                        List available profiles
  init <name>                 Scaffold a new profile from example.conf

Options:
  --profile <name>            Override profile selection
  --ports                     Forward ports via SSH
  --tmux                      Use tmux instead of dtach (split panes, no graphics)
  --no-persist                Connect directly, no session persistence
```

## Worktree scaffolding

`dev scaffold worktree` deploys `templates/worktree.sh` into a remote repo's `scripts/` directory. That script handles `git worktree add/remove` with safety checks (uncommitted changes, unmerged PRs via `gh`) and sources an optional repo-specific `scripts/.worktree-setup.sh` hook for per-project setup (installing deps, copying env files, etc.).

## Requirements

- macOS/Linux local, Linux remote
- `ssh`, `docker` on the remote
- `dtach` on the remote (or `tmux` if using `--tmux`)
- `gh` on the remote (for worktree PR safety checks)

## License

MIT.
