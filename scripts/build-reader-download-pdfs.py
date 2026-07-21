#!/usr/bin/env python3
"""
Build screen-quality download PDFs for Intrepid Dusk Volume 1.

Source (Sharon revised digital master):
  IntrepidDusk_Vol1_DIGITAL.pdf — 72 pages total. Pages 1–68 are reader story
  content; pages 69–72 are trailing sketch/process bonus pages.

Output:
  reader/intrepid-dusk-volume-1/downloads/
    intrepid-dusk-chapter-1.pdf   (pages 1–21)
    intrepid-dusk-chapter-2.pdf   (pages 22–42)
    intrepid-dusk-chapter-3.pdf   (pages 43–68)
    intrepid-dusk-volume-1.pdf    (pages 1–72, full digital master)
    README.md

The digital master is already web-optimized (JPEG ~150 dpi). We split/extract
only — no second rasterize pass.
"""
from __future__ import annotations

import os
import sys
import time
from pathlib import Path

import fitz

REPO = Path(__file__).resolve().parents[1]
OUT_DIR = REPO / "reader" / "intrepid-dusk-volume-1" / "downloads"
SRC = Path(
    r"C:\Users\tanja\Dropbox\StudioDropbox\ForPrint\Sharon_Handoff_Volume1"
    r"\REVISED_PDFS\IntrepidDusk_Vol1_DIGITAL.pdf"
)

# 1-based inclusive page ranges in the source PDF.
FULL_VOLUME_PAGES = (1, 72)
CHAPTERS = [
    ("chapter-1", 1, 21),
    ("chapter-2", 22, 42),
    ("chapter-3", 43, 68),
]
EXPECTED_SRC_PAGES = 72


def extract_pages(src_doc: fitz.Document, start: int, end: int, dst: Path) -> dict:
    """Extract 1-based inclusive page range [start, end] into dst."""
    t0 = time.time()
    out = fitz.open()
    # fitz uses 0-based indices; to_page is inclusive.
    out.insert_pdf(src_doc, from_page=start - 1, to_page=end - 1)
    dst.parent.mkdir(parents=True, exist_ok=True)
    tmp = dst.with_suffix(dst.suffix + ".tmp")
    out.save(tmp, garbage=4, deflate=True, clean=True)
    pages = out.page_count
    out.close()
    os.replace(tmp, dst)
    size_mb = dst.stat().st_size / (1024 * 1024)
    elapsed = time.time() - t0
    print(
        f"  -> {dst.name}: {pages} pages, {size_mb:.1f} MB in {elapsed:.1f}s",
        flush=True,
    )
    return {"path": dst, "pages": pages, "mb": size_mb, "sec": elapsed}


def write_readme(results: list[dict]) -> None:
    lines = [
        "# Intrepid Dusk Volume 1 — digital PDF downloads",
        "",
        "## Choice",
        "",
        "Full Volume 1 digital PDF ships the complete `IntrepidDusk_Vol1_DIGITAL.pdf`",
        f"({EXPECTED_SRC_PAGES} pages): story pages **1–68** plus sketch/process",
        "bonus pages **69–72**.",
        "",
        "Chapter downloads remain story content only (21 + 21 + 26 = 68 pages).",
        "",
        "## Source",
        "",
        f"- `{SRC.name}` ({EXPECTED_SRC_PAGES}p digital master)",
        "",
        "## Compression",
        "",
        "- Source is already web-optimized (JPEG ~150 dpi); split only, no re-rasterize",
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
    if not SRC.exists():
        raise SystemExit(f"Missing source: {SRC}")

    print(f"SRC={SRC}", flush=True)
    print(f"OUT_DIR={OUT_DIR}", flush=True)

    src_doc = fitz.open(SRC)
    if src_doc.page_count != EXPECTED_SRC_PAGES:
        raise SystemExit(
            f"{SRC.name}: expected {EXPECTED_SRC_PAGES} pages, "
            f"got {src_doc.page_count}"
        )

    results: list[dict] = []

    for slug, start, end in CHAPTERS:
        dst = OUT_DIR / f"intrepid-dusk-{slug}.pdf"
        print(f"\nExtracting {dst.name} (pages {start}–{end})...", flush=True)
        results.append(extract_pages(src_doc, start, end, dst))

    full_dst = OUT_DIR / "intrepid-dusk-volume-1.pdf"
    start, end = FULL_VOLUME_PAGES
    print(f"\nExtracting {full_dst.name} (pages {start}–{end})...", flush=True)
    results.append(extract_pages(src_doc, start, end, full_dst))

    src_doc.close()
    write_readme(results)

    print("\nDone.", flush=True)
    for r in results:
        print(f"  {r['path'].name}: {r['pages']}p  {r['mb']:.1f} MB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
