# Custom Code Red core

`mgba-wasm.data` is generated emulator code, never a game ROM or game asset.
The site preparation pipeline verifies SHA256
`d06d71a9353378f04237db5f095f83fddf660f6a13e63c8ef35a75676d161b0d`
and copies it to the ignored public emulator output. It retains upstream
`minimumEJSVersion: 4.2.2` / core version `2.0.2`; the frontend remains the
integrity-pinned official 4.2.3 package.

Source revisions and origins are in `sources.lock.json`. The reconstruction
files in `source/` contain the narrow mailbox adapter, generated fixed address,
and exact changes to pinned upstream checkouts. Full upstream corresponding
sources are available at each locked GitHub commit, and the build recipe and
ROM source patches are in https://github.com/mcembalest/pokemon-code-red at commit
`1f1346d05f5441a1b69f8b36d772b55893aa5122` on `dev/rom-runner-mailbox`. Build with the pinned Emscripten 3.1.74 SDK. Core build
metadata and mGBA's license are also inside the archive. RetroArch is GPL-3.0;
mGBA is MPL-2.0. The custom source files and upstream patch are copied to public
emulator output by the normal preparation pipeline for source inspection.

The mailbox is compiled for ROM SHA1
`0d16f8e90c320b5b737e39ed6c4f2aeafd1da622`, EWRAM `0x0203f4a8`.
The controller passes only six bounded numeric stats to a disposable QuickJS
worker, never a host pointer or emulator command. It does not support threaded
cores, runahead, or netplay. Emulator states from other ROM/core builds must not
be imported; the player's automatic save key includes the exact ROM and core
version. Physical iOS/Android verification remains separate from Chromium
mobile viewport/touch verification.

The fixed 60-byte naming mailbox is `0x02039990`. It accepts only bounded ASCII replacements/confirmation on active native naming screens. Epoch/session/sequence guards reject stale commands. The PC operation2 opens a fresh-VM JavaScript scratchpad; no host functions or arbitrary guest addresses are exposed. The normal build copies naming transport sources with the adapter.
