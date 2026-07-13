# ery-devkit

A collection of personal development tools. Most host tools live in their own
subdirectory as [GNU Stow](https://www.gnu.org/software/stow/) packages. npm
packages live under `packages/`.

## Tools

| Tool | Description |
| ---- | ----------- |
| [`dev-remote`](./dev-remote) | Connect from a local machine to a devcontainer on a remote server, with tmux/dtach session management for worktree-based parallel development. |
| [`mccusage`](./mccusage) | Aggregate all `ccusage`-detected agents across local, SSH, and devcontainer targets. |
| [`@xuwenhao83/openclaw-discord-autoname`](./packages/openclaw-discord-autoname) | OpenClaw plugin that automatically renames Discord threads after agent replies. |

## npm packages

```bash
pnpm install
pnpm --filter @xuwenhao83/openclaw-discord-autoname test
pnpm --filter @xuwenhao83/openclaw-discord-autoname build
```

## Installation

Install a single tool (example: `dev-remote`):

```bash
git clone https://github.com/xuwenhao/ery-devkit.git ~/ery-devkit
cd ~/ery-devkit
stow --no-folding --dir=. --target="$HOME" dev-remote
```

This creates symlinks like `~/.local/bin/dev` → `<repo>/dev-remote/.local/bin/dev` and `~/.config/dev-remote/example.conf` → `<repo>/dev-remote/.config/dev-remote/example.conf`.

Make sure `~/.local/bin` is on your `$PATH`.

## As a submodule inside another dotfiles repo

Both the tool code and per-machine private profiles (`.conf` files, which are git-ignored) can happily coexist:

```bash
cd ~/dotfiles
git submodule add https://github.com/xuwenhao/ery-devkit.git dev-tools
stow --no-folding --dir=dev-tools --target="$HOME" dev-remote
# Drop your private profiles into dev-tools/dev-remote/.config/dev-remote/*.conf
# They'll be gitignored by this repo's .gitignore.
```

## License

MIT. See [LICENSE](./LICENSE).
