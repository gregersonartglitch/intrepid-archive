from PIL import Image
import os

img = Image.open(r'C:\Users\tanja\.gemini\antigravity\scratch\intrepid-map\assets\medallion-sprites.png')
w, h = img.size
cw, ch = w // 4, h // 3
print(f"Image: {w}x{h}, Cell: {cw}x{ch}")

mapping = {
    'defender':     (0, 0),
    'lion':         (1, 0),
    'water':        (2, 0),
    'bull':         (3, 0),
    'twins':        (0, 1),
    'crab':         (1, 1),
    'fate':         (2, 1),
    'scorpion':     (3, 1),
    'firesatyr':    (0, 2),
    'goatfish':     (1, 2),
    'furrow':       (2, 2),
    'fish':         (3, 2),
}

outdir = r'C:\Users\tanja\.gemini\antigravity\scratch\intrepid-map\assets\medallions'
os.makedirs(outdir, exist_ok=True)

for name, (col, row) in mapping.items():
    cx = col * cw + cw // 2
    cy = row * ch + ch // 2
    half = min(cw, ch) // 2 - 30
    box = (cx - half, cy - half, cx + half, cy + half)
    crop = img.crop(box)
    crop = crop.resize((400, 400), Image.LANCZOS)
    crop.save(os.path.join(outdir, name + '.png'))
    print(f'{name}: center=({cx},{cy}), saved 400x400')
