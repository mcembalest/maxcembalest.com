# A small fractal tree: each generation of branches is RATIO times shorter, so the number of
# generations is log(trunk / twig) / log(1 / RATIO). Rendered 8x oversampled, then downsampled.
import math, random
from PIL import Image, ImageDraw
import numpy as np
from pathlib import Path

OUT = Path(__file__).resolve().parent / 'out'

G = 48            # grid size the cellular automaton runs on
SS = 8            # oversampling factor
RATIO = 0.72
TRUNK = 11.5
TWIG = 1.8
BARK = (92, 64, 43)
LEAVES = [(95, 143, 62), (134, 176, 90), (63, 111, 51), (160, 190, 100)]

def make(seed=3):
    rnd = random.Random(seed)
    img = Image.new('RGBA', (G * SS, G * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    leaves = []
    def branch(x, y, angle, length, width, depth):
        x2 = x + length * math.cos(angle)
        y2 = y - length * math.sin(angle)
        d.line([(x * SS, y * SS), (x2 * SS, y2 * SS)], fill=BARK + (255,), width=max(1, int(width * SS)))
        d.ellipse([(x2 - width / 2) * SS, (y2 - width / 2) * SS, (x2 + width / 2) * SS, (y2 + width / 2) * SS], fill=BARK + (255,))
        if length * RATIO < TWIG:
            leaves.append((x2, y2))
            return
        spread = math.radians(24 + rnd.uniform(-5, 5))
        lean = math.radians(rnd.uniform(-4, 4))
        branch(x2, y2, angle + spread + lean, length * RATIO, width * 0.68, depth + 1)
        branch(x2, y2, angle - spread + lean, length * RATIO * rnd.uniform(0.9, 1.0), width * 0.68, depth + 1)
    branch(G / 2, G - 3, math.pi / 2, TRUNK, 2.6, 0)
    for (x, y) in leaves:
        for _ in range(3):
            r = rnd.uniform(1.1, 1.8)
            cx, cy = x + rnd.uniform(-1.2, 1.2), y + rnd.uniform(-1.4, 0.8)
            c = rnd.choice(LEAVES)
            d.ellipse([(cx - r) * SS, (cy - r) * SS, (cx + r) * SS, (cy + r) * SS], fill=c + (255,))
    small = img.resize((G, G), Image.LANCZOS)
    a = np.asarray(small).astype(np.float32) / 255.0
    a[..., :3] *= a[..., 3:4]  # premultiplied color, as the automaton learns it
    return a, len(leaves)

if __name__ == '__main__':
    OUT.mkdir(exist_ok=True)
    t, n = make()
    np.save(str(OUT / 'target.npy'), t)
    rgb = np.where(t[..., 3:4] > 0, t[..., :3] / np.maximum(t[..., 3:4], 1e-6), 1)
    show = rgb * t[..., 3:4] + (1 - t[..., 3:4]) * np.array([0.98, 0.97, 0.95])
    Image.fromarray((show * 255).astype(np.uint8)).resize((G * 8, G * 8), Image.NEAREST).save(str(OUT / 'target.png'))
    print('leaves', n, 'alpha cells', int((t[..., 3] > 0.1).sum()))
