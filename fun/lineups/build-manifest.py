#!/usr/bin/env python3
"""Walk lineupscreenshots/ and write manifest.json mirroring its structure.

Run this whenever you add maps, agents, or screenshots:
    python3 tools/lineups/build-manifest.py
"""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parent
SCREENSHOTS = ROOT / "lineupscreenshots"
MANIFEST = ROOT / "manifest.json"

IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".gif", ".webp"}


def build(node: Path):
    entries = sorted(p for p in node.iterdir() if not p.name.startswith("."))
    dirs = [p for p in entries if p.is_dir()]
    files = [p for p in entries if p.is_file() and p.suffix.lower() in IMAGE_EXTS]

    if dirs:
        return {d.name: build(d) for d in dirs}
    return [f.name for f in files]


def main():
    if not SCREENSHOTS.is_dir():
        raise SystemExit(f"missing screenshots dir: {SCREENSHOTS}")

    tree = build(SCREENSHOTS)
    MANIFEST.write_text(json.dumps(tree, indent=2) + "\n")
    print(f"wrote {MANIFEST.relative_to(ROOT.parent.parent)}")


if __name__ == "__main__":
    main()
