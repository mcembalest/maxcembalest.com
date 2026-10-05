# Pokémon Code Red (embed)

The player is built and tested in https://github.com/mcembalest/pokemon-code-red
and published there as release bundles (`player-<rom>-<commit>`). This site
only pins one bundle and embeds it.

- `bundle.lock.json` — which bundle, plus its sha256
- `tools/fetch-code-red.mjs` — downloads + verifies it into `public/code-red/` (ignored) before dev/build
- `src/pages/pokemon-code-red.astro` — mounts it

Update: set `tag` and `sha256` from the release's `.sha256` file.
