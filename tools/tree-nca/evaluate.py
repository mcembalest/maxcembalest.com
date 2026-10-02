# Export weights for the site, render growth and healing, and write a deterministic test case.
import json, sys
import numpy as np
from pathlib import Path
import torch
import torch.nn.functional as F
from PIL import Image

OUT = Path(__file__).resolve().parent / 'out'
SITE = Path(__file__).resolve().parents[2] / 'src' / 'home'
CH, HID, G = 12, 64, 48
sd = torch.load(f'{OUT}/nca.pt', map_location='cpu')
w1 = sd['w1.weight'][:, :, 0, 0]; b1 = sd['w1.bias']; w2 = sd['w2.weight'][:, :, 0, 0]

ident = torch.tensor([[0, 0, 0], [0, 1, 0], [0, 0, 0]], dtype=torch.float32)
sx = torch.tensor([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], dtype=torch.float32) / 8
kernels = torch.stack([ident, sx, sx.T]).repeat(CH, 1, 1)[:, None]

def step(x, fire_rate=0.5, gen=None):
    alive = lambda s: F.max_pool2d(s[:, 3:4], 3, 1, 1) > 0.1
    pre = alive(x)
    p = F.conv2d(x, kernels, padding=1, groups=CH)
    h = F.relu(torch.einsum('kc,bchw->bkhw', w1, p) + b1[None, :, None, None])
    dx = torch.einsum('ck,bkhw->bchw', w2, h)
    if fire_rate < 1:
        fire = (torch.rand(x.shape[0], 1, x.shape[2], x.shape[3], generator=gen) < fire_rate).float()
        dx = dx * fire
    x = x + dx
    return x * (pre & alive(x)).float()

def seed(h=G, w=G, at=(G - 3, G // 2)):
    x = torch.zeros(1, CH, h, w); x[:, 3:, at[0], at[1]] = 1.0; return x

def to_rgb(x, bg=(0.98, 0.97, 0.95)):
    a = x[0, 3].clamp(0, 1).numpy()[..., None]
    rgb = x[0, :3].permute(1, 2, 0).numpy()
    straight = np.where(a > 0.02, rgb / np.maximum(a, 1e-6), 0).clip(0, 1)
    return straight * a + (1 - a) * np.array(bg)

# 1. Weights for the site, rounded to keep the file small.
r = lambda t: [float(f'{v:.5g}') for v in t.flatten().tolist()]
json.dump({'ch': CH, 'hid': HID, 'w1': r(w1), 'b1': r(b1), 'w2': r(w2)}, open(f'{SITE}/tree-weights.json', 'w'), separators=(',', ':'))

# 2. Growth, then a cut, then healing.
gen = torch.Generator().manual_seed(1)
frames, x = [], seed()
with torch.no_grad():
    for t in range(301):
        if t == 200:
            x[:, :, 8:26, 8:26] = 0     # cut away the upper-left canopy
        if t in (0, 10, 20, 40, 60, 100, 200, 201, 230, 260, 300):
            frames.append(to_rgb(x))
        x = step(x, gen=gen)
strip = np.concatenate(frames, axis=1)
Image.fromarray((strip * 255).astype(np.uint8)).resize((strip.shape[1] * 4, strip.shape[0] * 4), Image.NEAREST).save(f'{OUT}/growth.png')

# 3. Long-run stability: does it hold its shape for 2000 steps?
with torch.no_grad():
    x = seed()
    for t in range(2000):
        x = step(x, gen=gen)
    target = torch.tensor(np.load(f'{OUT}/target.npy')).permute(2, 0, 1)[None]
    print('loss after 2000 steps', float(((x[:, :4] - target) ** 2).mean()), 'max |state|', float(x.abs().max()))
    Image.fromarray((to_rgb(x) * 255).astype(np.uint8)).resize((G * 6, G * 6), Image.NEAREST).save(f'{OUT}/stable.png')

# 4. A deterministic case for the TypeScript port: fire every cell, sample the state.
with torch.no_grad():
    x = seed()
    rng = np.random.default_rng(0)
    checks = []
    for t in range(40):
        x = step(x, fire_rate=1.0)
        if t + 1 in (1, 10, 40):
            s = x[0].permute(1, 2, 0).numpy()  # H x W x CH
            live = np.argwhere(np.abs(s).sum(-1) > 1e-4)
            pick = live[rng.choice(len(live), size=min(64, len(live)), replace=False)]
            checks.append({
                'steps': t + 1,
                'abs_sum': float(np.abs(s).sum()),
                'cells': [{'y': int(y), 'x': int(xx), 'v': [float(f'{v:.7g}') for v in s[y, xx]]} for y, xx in pick],
            })
    json.dump({'size': G, 'seed': [G - 3, G // 2], 'checks': checks}, open(f'{SITE}/tree-parity.json', 'w'), separators=(',', ':'))
print('exported')
