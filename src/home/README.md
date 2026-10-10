# Image-native gardens

There is no tree target, sprite, learned silhouette, or fixed local grid. Each photograph is
its own cellular substrate. The same local rule can resemble roots, veins, ivy, or lightning.

- `garden.ts` samples the actual rendered image at 2 CSS pixels per cell, matching responsive
  sizing, cropping and object position. Pixels transfer only on load/geometry changes. Revision
  numbers reject stale worker frames. Unreadable cross-origin images disable planting.
- `terrain.ts` derives RGB conductivity and a local structure tensor. Its tangents favor
  travel **along** image contours. Strong color changes, excessive drift from a seed's material,
  transparency, and blocked diagonal corners prevent travel. Seeds settle locally beside seams.
- `filaments.ts` grows directly in photo space. A tip chooses a conductive empty neighbor using
  persistence, contour alignment, outward pressure and noise. Occasionally it bifurcates.
  Competing fronts, material boundaries and finite energy stop growth naturally. Pruning clears
  actual living cells; wound edges resume growth using the same rule. No hidden state can grow
  behind a render mask. Growth is the stepped leader: hot flickering tips, a stuttering channel.
  When the leader finishes (or two networks connect) a return stroke lights the whole powered
  component in one frame, then re-strikes after dark gaps. Nothing eases on or off. Strokes
  scorch the wires they cross and leave embers that cool; scorch is the dormant network.
  Clicking a scar re-strikes it; severing live wire arcs at the torn ends. Leaving the photo
  fires one final discharge, then clears. Rendering never changes growth randomness.
- `garden.worker.ts` schedules active growth/signals and transfers frames.

Each photo can also have an offline scene map, `<photo>.materials.png` (R conductance,
G nearness, B ground), made by `tools/garden/materials.py`: Depth Anything V2 for depth and
CLIPSeg material prompts, snapped to the photo's own edges. With it, depth jumps split
same-colored objects, current runs readily into metal but will not crawl back onto cloth,
cloth is expensive to cross, and leaders feel the nearest conductor. Over an insulator with
metal within `ARC_REACH`, a leader arcs through the air to it. Touching metal or reaching
ground fires the return stroke. Metal glows hot, cloth chars, air leaves no scar. Without a
map, every cell is the same middling material and behavior is purely image geometry.
Regenerate maps after changing a photo:

```sh
uv run tools/garden/materials.py src/assets/personal/*.png  # --debug DIR for label/channel images
```

Everything runs locally in the browser. No photo-specific coordinates are used by the runtime.

```sh
node --test 'src/home/*.test.ts'
npm run build
node tools/garden/inspect.ts /tmp/garden-filaments
```

The deterministic preview script writes growth and contour fields for both source photos.
It uses `sharp`, already available through Astro. Tests cover actual parent/child conductivity,
branching, bounded growth, thin/curved surfaces, silhouettes, corners, transparency, pruning,
rendered occupancy, responsive image sampling, signal transport/cleanup, and deterministic sparks.

To tune the electrical look, adjust `schedule()` (strobe pattern), `SCORCH`, `EMBER_COOLING`
and `LEADER_TICKS` in `filaments.ts`, and the halo/core strokes in `circuit-render.ts`. Light
and scorch are separate canvases (screen-blended and normal), both clipped to the conductive
surface: no glow can leak over an image boundary or refill a pruned gap.
