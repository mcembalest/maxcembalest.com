# /// script
# requires-python = ">=3.10"
# dependencies = ["torch", "transformers>=4.45", "pillow", "numpy"]
# ///
"""Offline scene maps for the home-page gardens.

Depth Anything V2 estimates relative depth; CLIPSeg scores open-vocabulary material prompts.
Each photo gets <name>.materials.png beside it, at the photo's aspect ratio:
  R conductance (0 insulator .. 255 metal), G nearness (0 far .. 255 near), B ground.
No alpha: canvases premultiply it, which would erase the other channels wherever ground is 0.

  uv run tools/garden/materials.py src/assets/personal/*.png [--debug DIR]
"""
import sys
from pathlib import Path

import numpy as np
import torch
from PIL import Image
from transformers import AutoImageProcessor, AutoModelForDepthEstimation, CLIPSegForImageSegmentation, CLIPSegProcessor

WIDTH = 320
PAD = 120
# Prompt, conductance. Generic materials, not objects from these particular photos.
MATERIALS = [
    ('shiny metal', 1.0), ('chrome metal stand or pole', 1.0), ('brass cymbal', 1.0),
    ('electrical cable or wire', 0.95), ('neon sign', 0.9), ('lamp or light bulb', 0.85),
    ('electronic device', 0.7), ('water', 0.75), ('human skin', 0.55), ('person', 0.45),
    ('hair or fur', 0.25), ('leaves or plants', 0.35), ('plastic', 0.2), ('wood', 0.15),
    ('brick or stone', 0.2), ('concrete or asphalt', 0.25), ('glass window', 0.1),
    ('cloth fabric or curtain', 0.05), ('clothing', 0.1), ('sky', 0.0), ('dark empty background', 0.05),
]
LIGHTS = ['neon sign', 'lamp or light bulb']
GROUND = ['floor', 'ground, road or sidewalk']


def tiles(image: Image.Image, size=352, overlap=0.67):
    # CLIPSeg works at 352px; tile it so thin stands and cables survive.
    w, h = image.size
    scale = size * 2 / min(w, h)
    image = image.resize((round(w * scale), round(h * scale)), Image.BICUBIC)
    # Mirror a margin so border pixels sit mid-tile with real context.
    a = np.pad(np.asarray(image), ((PAD, PAD), (PAD, PAD), (0, 0)), mode='reflect')
    image = Image.fromarray(a)
    w, h = image.size
    step = int(size * (1 - overlap))
    xs = sorted({*range(0, max(1, w - size), step), max(0, w - size)})
    ys = sorted({*range(0, max(1, h - size), step), max(0, h - size)})
    return image, [(x, y) for y in ys for x in xs]


def clipseg(image: Image.Image, prompts: list[str]):
    processor = CLIPSegProcessor.from_pretrained('CIDAS/clipseg-rd64-refined')
    model = CLIPSegForImageSegmentation.from_pretrained('CIDAS/clipseg-rd64-refined').eval()
    big, boxes = tiles(image)
    logits = np.zeros((len(prompts), big.height, big.width), np.float32)
    count = np.zeros((big.height, big.width), np.float32)
    window = np.outer(*[np.hanning(352) + 1e-3] * 2).astype(np.float32)  # seamless tile blending
    for x, y in boxes:
        crop = big.crop((x, y, x + 352, y + 352))
        inputs = processor(text=prompts, images=[crop] * len(prompts), padding=True, return_tensors='pt')
        with torch.no_grad():
            out = model(**inputs).logits.reshape(len(prompts), 1, 352, 352).numpy()[:, 0]
        logits[:, y:y + 352, x:x + 352] += out * window
        count[y:y + 352, x:x + 352] += window
    logits /= np.maximum(count, 1e-6)
    return logits[:, PAD:-PAD, PAD:-PAD], big.size


def depth(image: Image.Image):
    processor = AutoImageProcessor.from_pretrained('depth-anything/Depth-Anything-V2-Small-hf')
    model = AutoModelForDepthEstimation.from_pretrained('depth-anything/Depth-Anything-V2-Small-hf').eval()
    with torch.no_grad():
        out = model(**processor(images=image, return_tensors='pt')).predicted_depth
    d = torch.nn.functional.interpolate(out[None], size=image.size[::-1], mode='bicubic')[0, 0].numpy()
    lo, hi = np.percentile(d, [2, 98])
    return np.clip((d - lo) / (hi - lo + 1e-6), 0, 1)  # relative inverse depth: 1 = near


def snap(maps: np.ndarray, guide: np.ndarray, radius=4, spatial=2.5, tonal=0.08, passes=2):
    # Joint bilateral filter: low-resolution semantics snap to the photo's own color and depth edges.
    h, w = guide.shape[:2]
    for _ in range(passes):
        total = np.zeros_like(maps); weight = np.zeros((h, w), np.float32)
        pad_m = np.pad(maps, ((0, 0), (radius, radius), (radius, radius)), mode='edge')
        pad_g = np.pad(guide, ((radius, radius), (radius, radius), (0, 0)), mode='edge')
        for dy in range(-radius, radius + 1):
            for dx in range(-radius, radius + 1):
                g = pad_g[radius + dy:radius + dy + h, radius + dx:radius + dx + w]
                k = np.exp(-(dx * dx + dy * dy) / (2 * spatial ** 2) - ((g - guide) ** 2).sum(-1) / (2 * tonal ** 2))
                total += pad_m[:, radius + dy:radius + dy + h, radius + dx:radius + dx + w] * k
                weight += k
        maps = total / weight
    return maps


def resize(a: np.ndarray, size):
    return np.asarray(Image.fromarray(a.astype(np.float32), mode='F').resize(size, Image.BILINEAR))


def main(paths: list[str], debug: Path | None):
    for path in (p for p in map(Path, paths) if not p.name.endswith('.materials.png')):
        image = Image.open(path).convert('RGB')
        size = (WIDTH, round(WIDTH * image.height / image.width))
        prompts = [p for p, _ in MATERIALS] + GROUND
        logits, _ = clipseg(image, prompts)
        logits = np.stack([resize(l, size) for l in logits])
        material = logits[:len(MATERIALS)]
        p = np.exp((material - material.max(0)) * 3)
        p /= p.sum(0)
        near = resize(depth(image), size)
        rgb = np.asarray(image.resize(size, Image.LANCZOS), np.float32) / 255
        guide = np.concatenate([rgb, near[..., None] * 1.5], -1)
        sigmoid = lambda v: 1 / (1 + np.exp(-v))
        ground = np.maximum(*[sigmoid(logits[len(MATERIALS) + i]) for i in range(len(GROUND))])
        p, ground = (lambda m: (m[:-1], m[-1]))(snap(np.concatenate([p, ground[None]]), guide))
        conduct = np.tensordot(np.array([c for _, c in MATERIALS], np.float32), p, 1)
        light = sum(p[[m for m, _ in MATERIALS].index(n)] for n in LIGHTS)
        rgb = np.stack([conduct, near, ground], -1)
        out = path.with_suffix('.materials.png')
        Image.fromarray((np.clip(rgb, 0, 1) * 255).round().astype(np.uint8), 'RGB').save(out, optimize=True)
        print(out, size, f'conduct {conduct.mean():.2f}', f'ground {ground.mean():.2f}')
        if debug:
            debug.mkdir(parents=True, exist_ok=True)
            label = np.array([[60, 60, 60], [200, 200, 220], [230, 230, 255], [255, 200, 60], [255, 120, 0], [255, 0, 255],
                              [255, 255, 0], [0, 255, 255], [0, 120, 255], [255, 150, 150], [200, 100, 150], [150, 80, 40],
                              [0, 160, 0], [255, 255, 255], [120, 70, 20], [180, 60, 40], [130, 130, 130], [100, 200, 255],
                              [80, 0, 120], [0, 0, 160], [100, 150, 255], [20, 20, 20]][:len(MATERIALS)], np.uint8)
            Image.fromarray(label[p.argmax(0)]).save(debug / f'{path.stem}-label.png')
            for name, a in [('conduct', conduct), ('near', near), ('light', light), ('ground', ground)]:
                Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).save(debug / f'{path.stem}-{name}.png')
            for k, (name, _) in enumerate(MATERIALS):
                Image.fromarray((p[k] * 255).astype(np.uint8)).save(debug / f'{path.stem}-m{k:02d}-{name.replace(" ", "_")}.png')


if __name__ == '__main__':
    args = sys.argv[1:]
    debug = None
    if '--debug' in args:
        i = args.index('--debug'); debug = Path(args[i + 1]); del args[i:i + 2]
    main(args, debug)
