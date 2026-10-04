# Custom Code Red core

`mgba-wasm.data` is generated emulator code, never a game ROM or game asset.
The site preparation pipeline verifies SHA256
`4a0744b88a8c74c026dc57c35b97d0c45adb275a31601b455c9678688368cbf4`
and copies it to the ignored public emulator output. It retains upstream
`minimumEJSVersion: 4.2.2` / core version `2.0.2`; the frontend remains the
integrity-pinned official 4.2.3 package.

Source revisions and origins are in `sources.lock.json`. The reconstruction
files in `source/` contain the narrow mailbox adapter, generated fixed address,
and exact changes to pinned upstream checkouts. Full upstream corresponding
sources are available at each locked GitHub commit, and the build recipe and
ROM source patches are in https://github.com/mcembalest/pokemon-code-red at commit
`79b9c9bdc319e4f05dd2539473f749b2d9c616ea` on `dev/rom-runner-mailbox`. Build with the pinned Emscripten 3.1.74 SDK. Core build
metadata and mGBA's license are also inside the archive. RetroArch is GPL-3.0;
mGBA is MPL-2.0. The custom source files and upstream patch are copied to public
emulator output by the normal preparation pipeline for source inspection.

The mailbox is compiled for ROM SHA1
`d3ddd18cc5466b78624e3ce7c6db779ed2a15cd9`, EWRAM `0x0203f468`.
The controller passes only six bounded numeric stats to a disposable QuickJS
worker, never a host pointer or emulator command. It does not support threaded
cores, runahead, or netplay. Emulator states from other ROM/core builds must not
be imported; the player's automatic save key includes the exact ROM and core
version. Physical iOS/Android verification remains separate from Chromium
mobile viewport/touch verification.
