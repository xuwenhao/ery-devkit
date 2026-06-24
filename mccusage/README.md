# mccusage (stow config package)

This stow package installs the example config for mccusage:

```bash
stow --no-folding --dir=. --target="$HOME" mccusage
cp ~/.config/mccusage/example.json ~/.config/mccusage/config.json
# edit config.json to reflect your machines
```

For the CLI itself, install via npm:

```bash
npm install -g @xuwenhao83/mccusage
```

See `packages/mccusage/` in this repo for source and full docs.
