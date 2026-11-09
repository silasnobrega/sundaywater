# Builds atlas.webp/atlas.png + frames.json from the 2x2 sprite sheets.
# Keys out the white sheet background by flood-fill from the edges (interior whites like eyes stay).
import json
from collections import deque
from PIL import Image, ImageFilter

SRC = 'src'
NAMES = ['drip', 'rust', 'chlor', 'scale', 'specks']
POSES = ['move', 'idle', 'caught', 'out']
CELL = 240
PAD = 6

def key_out(im):
    im = im.convert('RGBA')
    w, h = im.size
    px = im.load()
    def is_white(x, y):
        r, g, b, a = px[x, y]
        return r > 236 and g > 236 and b > 236
    mask = bytearray(w * h)
    dq = deque()
    for x in range(w):
        dq.append((x, 0)); dq.append((x, h - 1))
    for y in range(h):
        dq.append((0, y)); dq.append((w - 1, y))
    while dq:
        x, y = dq.popleft()
        i = y * w + x
        if mask[i] or not is_white(x, y):
            continue
        mask[i] = 1
        if x > 0: dq.append((x - 1, y))
        if x < w - 1: dq.append((x + 1, y))
        if y > 0: dq.append((x, y - 1))
        if y < h - 1: dq.append((x, y + 1))
    # alpha: 0 in flooded region; soft edge for light pixels touching it
    alpha = Image.new('L', (w, h), 255)
    ap = alpha.load()
    for y in range(h):
        for x in range(w):
            i = y * w + x
            if mask[i]:
                ap[x, y] = 0
            else:
                adj = (x > 0 and mask[i - 1]) or (x < w - 1 and mask[i + 1]) or (y > 0 and mask[i - w]) or (y < h - 1 and mask[i + w])
                if adj:
                    r, g, b, a = px[x, y]
                    m = min(r, g, b)
                    if m > 200:
                        ap[x, y] = max(0, min(255, int((255 - m) / 55 * 255)))
    im.putalpha(alpha)
    return im

def bbox_alpha(im, box):
    sub = im.crop(box)
    bb = sub.split()[3].point(lambda v: 255 if v > 8 else 0).getbbox()
    if not bb:
        return None
    x0, y0, x1, y1 = bb
    return (box[0] + x0 - PAD, box[1] + y0 - PAD, box[0] + x1 + PAD, box[1] + y1 + PAD)

atlas = Image.new('RGBA', (CELL * 4, CELL * len(NAMES)), (0, 0, 0, 0))
frames = {}
for r, name in enumerate(NAMES):
    im = key_out(Image.open(f'{SRC}/sw-{name}.png'))
    w, h = im.size
    for q, pose in enumerate(POSES):
        qx, qy = (q % 2) * w // 2, (q // 2) * h // 2
        bb = bbox_alpha(im, (qx, qy, qx + w // 2, qy + h // 2))
        spr = im.crop(bb)
        s = min((CELL - 8) / spr.width, (CELL - 8) / spr.height)
        dw, dh = round(spr.width * s), round(spr.height * s)
        spr = spr.resize((dw, dh), Image.LANCZOS)
        dx = q * CELL + (CELL - dw) // 2
        dy = r * CELL + (CELL - 4 - dh)
        atlas.alpha_composite(spr, (dx, dy))
        frames[f'{name}.{pose}'] = {'x': dx, 'y': dy, 'w': dw, 'h': dh}

atlas.save('atlas.png', optimize=True)
atlas.save('atlas.webp', quality=90, method=6)
json.dump({'cell': CELL, 'frames': frames}, open('frames.json', 'w'), indent=1)

# plate: keep PNG master, ship webp + jpg fallback
plate = Image.open(f'{SRC}/sw-plate.png').convert('RGB')
plate.save('plate.webp', quality=88, method=6)
plate.save('plate.jpg', quality=90, optimize=True, progressive=True)
print('ok', atlas.size, len(frames))
