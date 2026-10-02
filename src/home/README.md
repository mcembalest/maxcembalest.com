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
  behind a render mask. Conductance brightens shared stems; young tips briefly glimmer.
- `garden.worker.ts` schedules active growth and transfers frames. Settled patterns sleep.

Everything is local to the browser. This is **image geometry, not semantic segmentation or
3D depth**: similar-colored touching objects can share a substrate, and a shadow can divide
one. No photo-specific coordinates or object masks are used by the runtime.

```sh
node --test 'src/home/*.test.ts'
npm run build
node tools/garden/inspect.ts /tmp/garden-filaments
```

The deterministic preview script writes growth and contour fields for both source photos.
It uses `sharp`, already available through Astro. Tests cover actual parent/child conductivity,
branching, bounded growth, thin/curved surfaces, silhouettes, corners, transparency, pruning,
rendered occupancy, and responsive image sampling.
