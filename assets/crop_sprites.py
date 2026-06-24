from PIL import Image
img = Image.open(r'C:\Users\tanja\.gemini\antigravity\scratch\intrepid-map\assets\medallion-sprites.png')
w, h = img.size
cw, ch = w // 4, h // 3

# Hand-tuned centers for each carving (adjusted from pure grid centers)
mapping = {
    'defender':  (620, 610),   # row0 col0 - archer shifted right
    'lion':      (1800, 600),  # row0 col1 
    'water':     (3000, 600),  # row0 col2
    'bull':      (4170, 590),  # row0 col3 - bull shifted left slightly
    'twins':     (590, 1790),  # row1 col0
    'crab':      (1810, 1780), # row1 col1
    'fate':      (3000, 1800), # row1 col2
    'scorpion':  (4200, 1790), # row1 col3
    'firesatyr': (600, 2990),  # row2 col0
    'goatfish':  (1800, 2990), # row2 col1
    'furrow':    (3000, 2990), # row2 col2
    'fish':      (4200, 2990), # row2 col3
}

import os
outdir = r'C:\Users\tanja\.gemini\antigravity\scratch\intrepid-map\assets\medallions'
half = 540  # crop radius

for name, (cx, cy) in mapping.items():
    box = (max(0, cx - half), max(0, cy - half), min(w, cx + half), min(h, cy + half))
    crop = img.crop(box)
    crop = crop.resize((400, 400), Image.LANCZOS)
    crop.save(os.path.join(outdir, name + '.png'))
    print(f'{name}: center=({cx},{cy}), saved')
