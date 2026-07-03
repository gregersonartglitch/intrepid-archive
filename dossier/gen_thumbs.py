import os
import glob
from PIL import Image

d = os.path.dirname(os.path.abspath(__file__))
thumb_dir = os.path.join(d, 'thumbs')
os.makedirs(thumb_dir, exist_ok=True)

THUMB_SIZE = 96
QUALITY = 82

results = []
for src in sorted(set(glob.glob(os.path.join(d, '*.png')))):
    base = os.path.basename(src)
    name = os.path.splitext(base)[0]
    safe = name.replace(' ', '_')
    out_webp = os.path.join(thumb_dir, safe + '.webp')

    img = Image.open(src).convert('RGB')
    img.thumbnail((THUMB_SIZE, THUMB_SIZE), Image.LANCZOS)
    img.save(out_webp, 'WEBP', quality=QUALITY, method=6)

    src_size = os.path.getsize(src)
    webp_size = os.path.getsize(out_webp)
    results.append((base, src_size, webp_size))

report_path = os.path.join(d, '_thumb_sizes.txt')
with open(report_path, 'w', encoding='utf-8') as f:
    f.write('Thumbnail size: %spx, WebP quality: %s\n\n' % (THUMB_SIZE, QUALITY))
    f.write('%-42s %10s %10s %8s\n' % ('Source', 'Full', 'Thumb', 'Saved'))
    f.write('-' * 72 + '\n')
    total_full = total_thumb = 0
    for base, src_size, webp_size in results:
        saved = 100 * (1 - webp_size / src_size)
        f.write('%-42s %10d %10d %6.1f%%\n' % (base, src_size, webp_size, saved))
        total_full += src_size
        total_thumb += webp_size
    f.write('-' * 72 + '\n')
    pct = 100 * (1 - total_thumb / total_full)
    f.write('%-42s %10d %10d %6.1f%%\n' % ('TOTAL', total_full, total_thumb, pct))
    f.write('\nSidebar load (all 11 thumbs): %s bytes (%.1f KB)\n' % (total_thumb, total_thumb / 1024))
    f.write('Before (all 11 full PNGs in sidebar): %s bytes (%.1f MB)\n' % (total_full, total_full / 1024 / 1024))

print('Generated %d thumbnails' % len(results))
print(open(report_path, encoding='utf-8').read())
