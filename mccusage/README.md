# mccusage

Aggregate `ccusage` token reports across multiple configured machines.

## Install

From the `dev-tools` repo:

```bash
stow --no-folding --dir=. --target="$HOME" mccusage
cd ~/.local/share/mccusage
pnpm install
pnpm build
```

Create a local config:

```bash
mkdir -p ~/.config/mccusage
cp ~/.config/mccusage/example.json ~/.config/mccusage/config.json
```

## Usage

```bash
mccusage daily --since 2026-06-01 --until 2026-06-16
mccusage daily --no-cost --since 2026-06-01 --until 2026-06-16
mccusage monthly --agents codex --json
```

The command runs focused `ccusage` JSON commands on each enabled target and sums token fields locally. Text output uses a `ccusage all`-style table with agent/model breakdowns and cost enabled by default. It does not copy raw Claude Code or Codex logs between machines.
