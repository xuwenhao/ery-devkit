# mccusage

Aggregate `ccusage` token reports across multiple configured machines.

Runs `npx ccusage` on each configured target (local, SSH, or dev-remote devcontainer) and merges the token counts into a single table.

## Install

```bash
npm install -g @xuwenhao83/mccusage
```

## Setup

Create a config file at `~/.config/mccusage/config.json`. Start from an example:

```bash
mkdir -p ~/.config/mccusage
# Copy one of the examples from the package:
# ~/.config/mccusage/config.json  (edit this file)
```

Minimal config for local-only use:

```json
{
  "ccusagePackage": "ccusage",
  "timezone": "America/New_York",
  "targets": [
    { "name": "local", "type": "local", "enabled": true }
  ]
}
```

See `examples/` for a config that also shows SSH and dev-remote targets.

### Target types

| type | what it does |
|---|---|
| `local` | runs `npx ccusage` in the current process |
| `ssh` | SSHes into `host` and runs `npx ccusage` there (sources nvm if present) |
| `dev-remote` | reads a `dev-remote` profile from `~/.config/dev-remote/<profile>.conf`, SSHes to the host, and runs `npx ccusage` inside the matching Docker container |

## Usage

```bash
mccusage daily --since 2026-06-01 --until 2026-06-16
mccusage daily --no-cost --since 2026-06-01 --until 2026-06-16
mccusage monthly --agents codex --json
mccusage session
```

### Options

```
Usage: mccusage <daily|monthly|session> [options]

Options:
  --config <path>          Config file path (default: ~/.config/mccusage/config.json)
  --agents <list>          Comma-separated agents: claude,codex
  --since <YYYY-MM-DD>     Start date passed to ccusage
  --until <YYYY-MM-DD>     End date passed to ccusage
  --no-cost                Hide cost fields in ccusage JSON/output
  --include-cost           Show cost fields (default; kept for compatibility)
  --json                   Print aggregate JSON
  --concurrency <n>        Concurrent target-agent jobs (default: 4)
  -h, --help               Show this help
```

Exit code is 2 if any targets fail; their errors appear in a Failures table below the main output.

## Development

```bash
git clone https://github.com/xuwenhao/ery-devkit
cd ery-devkit
pnpm install
pnpm --filter @xuwenhao83/mccusage build
pnpm --filter @xuwenhao83/mccusage test
# link globally for local testing:
pnpm --filter @xuwenhao83/mccusage link --global
```
