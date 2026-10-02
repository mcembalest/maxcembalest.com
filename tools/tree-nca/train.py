# Train a growing, regenerating neural cellular automaton (Mordvintsev et al., 2020) on the tree.
#
#   uv venv && uv pip install torch numpy pillow
#   python target.py               # draws out/target.npy
#   python train.py mps 6000       # ~8 minutes on an M3 Max; writes out/nca.pt
#   python evaluate.py             # writes src/home/tree-weights.json and tree-parity.json,
#                                  # plus out/growth.png and out/stable.png to look at
import sys, time, json, math
import numpy as np
from pathlib import Path
import torch
import torch.nn.functional as F

torch.manual_seed(0)
np.random.seed(0)
DEV = sys.argv[1] if len(sys.argv) > 1 else 'cpu'
ITERS = int(sys.argv[2]) if len(sys.argv) > 2 else 4000
OUT = Path(__file__).resolve().parent / 'out'
CH, HID, G = 12, 64, 48
SEED_YX = (G - 3, G // 2)
FIRE = 0.5
POOL, BATCH = 1024, 8

target = torch.tensor(np.load(f'{OUT}/target.npy')).permute(2, 0, 1)[None].to(DEV)  # 1x4xGxG

ident = torch.tensor([[0, 0, 0], [0, 1, 0], [0, 0, 0]], dtype=torch.float32)
sobel_x = torch.tensor([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], dtype=torch.float32) / 8
kernels = torch.stack([ident, sobel_x, sobel_x.T])                  # 3x3x3
kernels = kernels.repeat(CH, 1, 1)[:, None].to(DEV)                  # (3*CH)x1x3x3, ordered per channel

class NCA(torch.nn.Module):
    def __init__(self):
        super().__init__()
        self.w1 = torch.nn.Conv2d(CH * 3, HID, 1)
        self.w2 = torch.nn.Conv2d(HID, CH, 1, bias=False)
        torch.nn.init.zeros_(self.w2.weight)

    def forward(self, x):
        alive = lambda s: F.max_pool2d(s[:, 3:4], 3, 1, 1) > 0.1
        pre = alive(x)
        p = F.conv2d(x, kernels, padding=1, groups=CH)                # perception
        dx = self.w2(F.relu(self.w1(p)))
        fire = (torch.rand(x.shape[0], 1, G, G, device=DEV) < FIRE).float()
        x = x + dx * fire
        return x * (pre & alive(x)).float()

def seed(n):
    x = torch.zeros(n, CH, G, G, device=DEV)
    x[:, 3:, SEED_YX[0], SEED_YX[1]] = 1.0
    return x

def damage(x):
    # Cut a random circle out of each state.
    n = x.shape[0]
    yy, xx = torch.meshgrid(torch.linspace(-1, 1, G, device=DEV), torch.linspace(-1, 1, G, device=DEV), indexing='ij')
    c = torch.rand(n, 2, 1, 1, device=DEV) * 1.2 - 0.6
    r = torch.rand(n, 1, 1, device=DEV) * 0.3 + 0.1
    mask = ((xx - c[:, 0]) ** 2 + (yy - c[:, 1]) ** 2 < r ** 2)[:, None]
    return x * (~mask).float()

model = NCA().to(DEV)
opt = torch.optim.Adam(model.parameters(), lr=2e-3)
sched = torch.optim.lr_scheduler.MultiStepLR(opt, [2000, 4000], 0.3)
pool = seed(POOL)

t0 = time.time()
for it in range(1, ITERS + 1):
    idx = torch.randint(0, POOL, (BATCH,), device=DEV)
    x = pool[idx].clone()
    with torch.no_grad():
        per = ((x[:, :4] - target) ** 2).mean((1, 2, 3))
        order = per.argsort(descending=True)
        x = x[order]; idx = idx[order]
        x[:1] = seed(1)              # replace the worst with a fresh seed
        x[-3:] = damage(x[-3:])      # cut up the best few so it learns to heal
    steps = np.random.randint(64, 97)
    for _ in range(steps):
        x = model(x)
    loss = ((x[:, :4] - target) ** 2).mean()
    opt.zero_grad()
    loss.backward()
    for p in model.parameters():
        p.grad /= p.grad.norm() + 1e-8
    opt.step(); sched.step()
    pool[idx] = x.detach()
    if it % 100 == 0 or it == 1:
        print(f'{it:5d} loss {loss.item():.5f} lr {sched.get_last_lr()[0]:.1e} {time.time() - t0:.0f}s', flush=True)
    if it % 500 == 0 or it == ITERS:
        torch.save(model.state_dict(), f'{OUT}/nca.pt')
print(f'done {ITERS} iters in {time.time() - t0:.1f}s', flush=True)
