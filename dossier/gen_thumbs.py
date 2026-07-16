import os
import glob
from PIL import Image

d = os.path.dirname(os.path.abspath(__file__))
thumb_dir = os.path.join(d, 'thumbs')
portrait_dir = os.path.join(d, 'portraits')
os.makedirs(thumb_dir, exist_ok=True)
os.makedirs(portrait_dir, exist_ok=True)

THUMB_SIZE = 96
PORTRAIT_SIZE = 640
QUALITY = 82

results = []
for src in sorted(set(glob.glob(os.path.join(d, '*.png')))):
    base = os.path.basename(src)
    name = os.path.splitext(base)[0]
    safe = name.replace(' ', '_')
    img = Image.open(src).convert('RGB')

    thumb = img.copy()
    thumb.thumbnail((THUMB_SIZE, THUMB_SIZE), Image.LANCZOS)
    out_webp = os.path.join(thumb_dir, safe + '.webp')
    thumb.save(out_webp, 'WEBP', quality=QUALITY, method=6)

    port = img.copy()
    port.thumbnail((PORTRAIT_SIZE, PORTRAIT_SIZE), Image.LANCZOS)
    out_port = os.path.join(portrait_dir, safe + '.webp')
    port.save(out_port, 'WEBP', quality=QUALITY, method=6)

    src_size = os.path.getsize(src)
    webp_size = os.path.getsize(out_webp)
    port_size = os.path.getsize(out_port)
    results.append((base, src_size, webp_size, port_size, port.size))

report_path = os.path.join(d, '_thumb_sizes.txt')
with open(report_path, 'w', encoding='utf-8') as f:
    f.write('Thumbnail: %spx, Portrait: %spx, WebP quality: %s\n\n' % (THUMB_SIZE, PORTRAIT_SIZE, QUALITY))
    f.write('%-42s %10s %10s %10s\n' % ('Source', 'Full', 'Thumb', 'Portrait'))
    f.write('-' * 78 + '\n')
    total_full = total_thumb = total_port = 0
    for base, src_size, webp_size, port_size, size in results:
        f.write('%-42s %10d %10d %10d  %s\n' % (base, src_size, webp_size, port_size, size))
        total_full += src_size
        total_thumb += webp_size
        total_port += port_size
    f.write('-' * 78 + '\n')
    f.write('%-42s %10d %10d %10d\n' % ('TOTAL', total_full, total_thumb, total_port))
    f.write('\nSidebar load (all thumbs): %.1f KB\n' % (total_thumb / 1024))
    f.write('Detail load (all portraits): %.1f KB\n' % (total_port / 1024))
    f.write('Before (all full PNGs): %.1f MB\n' % (total_full / 1024 / 1024))

print('Generated %d thumbnail + portrait sets' % len(results))
print(open(report_path, encoding='utf-8').read())
