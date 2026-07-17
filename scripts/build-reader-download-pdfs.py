#!/usr/bin/env python3
"""
Build screen-quality download PDFs for Intrepid Dusk Volume 1.

Sources (Sharon revised OnPrint masters):
  - issue 1 / 2 / 3 chapter PDFs (21 + 21 + 26 = 68 pages)
  - Full Volume 1 digital = concatenate chapters 1–3 (NOT the 72-page press
    splice, which includes trailing sketch pages).

Output:
  reader/intrepid-dusk-volume-1/downloads/
    intrepid-dusk-chapter-1.pdf
    intrepid-dusk-chapter-2.pdf
    intrepid-dusk-chapter-3.pdf
    intrepid-dusk-volume-1.pdf
    README.md

Compression: rasterize each page to JPEG (~150–175 dpi screen), rebuild PDF.
"""
from __future__ import annotations

import sys
import time
from pathlib import Path

import fitz

REPO = Path(__file__).resolve().parents[1]
OUT_DIR = REPO / "reader" / "intrepid-dusk-volume-1" / "downloads"
SRC_DIR = Path(
    r"C:\Users\tanja\Dropbox\StudioDropbox\ForPrint\Sharon_Handoff_Volume1\REVISED_PDFS"
)

CHAPTERS = [
    ("chapter-1", SRC_DIR / "issue 1_revised_for_OnPrint.pdf", 21),
    ("chapter-2", SRC_DIR / "issue 2_fixed_revised_for_Onprint.pdf", 21),
    ("chapter-3", SRC_DIR / "issue 3_revised_onprint.pdf", 26),
]

# Screen download targets: readable on tablet/phone, web-friendly sizes.
DPI = 160
JPEG_QUALITY = 80


def rasterize_pdf(src: Path, dst: Path, expected_pages: int | None = None) -> dict:
    src_doc = fitz.open(src)
    if expected_pages is not None and src_doc.page_count != expected_pages:
        raise SystemExit(
            f"{src.name}: expected {expected_pages} pages, got {src_doc.page_count}"
        )

    out = fitz.open()
    zoom = DPI / 72.0
    mat = fitz.Matrix(zoom, zoom)
    t0 = time.time()

    for i in range(src_doc.page_count):
        page = src_doc[i]
        pix = page.get_pixmap(matrix=mat, alpha=False)
        # Keep original page size in points so layout matches print trim.
        new_page = out.new_page(width=page.rect.width, height=page.rect.height)
        new_page.insert_image(
            new_page.rect,
            stream=pix.tobytes("jpeg", jpg_quality=JPEG_QUALITY),
        )
        if (i + 1) % 5 == 0 or i == 0 or i + 1 == src_doc.page_count:
            print(
                f"  page {i + 1}/{src_doc.page_count}  "
                f"{pix.width}x{pix.height}px",
                flush=True,
            )

    dst.parent.mkdir(parents=True, exist_ok=True)
    out.save(
        dst,
        garbage=4,
        deflate=True,
        clean=True,
    )
    out.close()
    src_doc.close()

    size_mb = dst.stat().st_size / (1024 * 1024)
    elapsed = time.time() - t0
    info = {
        "path": dst,
        "pages": expected_pages if expected_pages is not None else "?",
        "mb": size_mb,
        "sec": elapsed,
    }
    print(f"  -> {dst.name}: {size_mb:.1f} MB in {elapsed:.1f}s", flush=True)
    return info


def concat_pdfs(sources: list[Path], dst: Path) -> dict:
    out = fitz.open()
    t0 = time.time()
    total_pages = 0
    for src in sources:
        doc = fitz.open(src)
        out.insert_pdf(doc)
        total_pages += doc.page_count
        doc.close()
    dst.parent.mkdir(parents=True, exist_ok=True)
    out.save(dst, garbage=4, deflate=True, clean=True)
    out.close()
    size_mb = dst.stat().st_size / (1024 * 1024)
    elapsed = time.time() - t0
    print(
        f"  -> {dst.name}: {total_pages} pages, {size_mb:.1f} MB in {elapsed:.1f}s",
        flush=True,
    )
    return {"path": dst, "pages": total_pages, "mb": size_mb, "sec": elapsed}


def write_readme(results: list[dict]) -> None:
    lines = [
        "# Intrepid Dusk Volume 1 — digital PDF downloads",
        "",
        "## Choice",
        "",
        "Full Volume 1 digital PDF is assembled from the three revised chapter",
        "masters (Issue 1 + 2 + 3 = **68 pages**).",
        "",
        "We did **not** ship `Intrepid-Dusk-Interior-press_72pg_v2_SPLICED.pdf`",
        "as the download volume — that press file includes trailing sketch /",
        "extra pages beyond the reader content.",
        "",
        "## Sources",
        "",
        "- `issue 1_revised_for_OnPrint.pdf` (21p)",
        "- `issue 2_fixed_revised_for_Onprint.pdf` (21p)",
        "- `issue 3_revised_onprint.pdf` (26p)",
        "",
        "## Compression",
        "",
        f"- Rasterized at **{DPI} dpi**, JPEG quality **{JPEG_QUALITY}**",
        "- Built for screen download (not print masters)",
        "",
        "## Files",
        "",
        "| File | Pages | Size |",
        "|------|------:|-----:|",
    ]
    for r in results:
        lines.append(
            f"| `{r['path'].name}` | {r['pages']} | {r['mb']:.1f} MB |"
        )
    lines.append("")
    (OUT_DIR / "README.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    print(f"OUT_DIR={OUT_DIR}", flush=True)
    print(f"DPI={DPI} JPEG_QUALITY={JPEG_QUALITY}", flush=True)

    results: list[dict] = []
    chapter_outs: list[Path] = []

    for slug, src, pages in CHAPTERS:
        if not src.exists():
            raise SystemExit(f"Missing source: {src}")
        dst = OUT_DIR / f"intrepid-dusk-{slug}.pdf"
        print(f"\nBuilding {dst.name} from {src.name}...", flush=True)
        info = rasterize_pdf(src, dst, expected_pages=pages)
        results.append(info)
        chapter_outs.append(dst)

    full_dst = OUT_DIR / "intrepid-dusk-volume-1.pdf"
    print(f"\nAssembling full volume from chapters 1–3...", flush=True)
    # Concat already-compressed chapter PDFs (no second rasterize).
    results.append(concat_pdfs(chapter_outs, full_dst))

    write_readme(results)
    print("\nDone.", flush=True)
    for r in results:
        print(f"  {r['path'].name}: {r['pages']}p  {r['mb']:.1f} MB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
