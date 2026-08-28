#!/usr/bin/env python3
"""
Extract real silhouette geometry from the traced body-part SVGs the user supplied
in assets/SVG body parts/.

These are genuine vector traces of the reference artwork -- every <path> is a small
filled sliver of ink -- so there is no authored curve to read, only a point cloud.
We recover the outer silhouette by bucketing every point in the file by height and
taking the min/max x per bucket. This is geometry extracted from the real drawing,
not approximated by hand, which is the whole reason to prefer these files over the
procedural ones in build_figure.py.

QA: 01_head.svg and 06_hips.svg came back as solid filled regions (fill ratio ~0.65-0.70
of their own path's bbox) rather than outline traces (~0.01-0.09 for the other five) --
almost certainly a different trace setting was used for those two exports. They are
EXCLUDED here and the app falls back to the procedural head/hips until re-traced.
04_right_arm.svg was not present in the folder; the app mirrors 03_left_arm.svg as a
temporary stand-in, flagged in output.
"""
import json, pathlib, re

SRC = pathlib.Path(__file__).resolve().parents[1] / "SVG body parts"
OUT = pathlib.Path(__file__).resolve().parents[1] / "figure" / "real"

# Real-world span each file represents, and where within its own pixel height the
# region landmarks fall (as a fraction of the drawn part, 0=top). These are visual
# estimates from the rendered artwork, not measured -- flagged as an open item.
GOOD = {
    "02_neck_and_torso.svg": dict(id="torso", label="Neck & torso", view="front",
        cmSpan=52, sided=False,
        regions=[("chest", "collarbone to sternum", 17, 0.0, 0.33),
                 ("abdomen", "sternum to waist", 27, 0.33, 1.0)]),
    "05_back_with_neck.svg": dict(id="back", label="Back", view="back",
        cmSpan=68, sided=False, regions=[]),
    "03_left_arm.svg": dict(id="arm", label="Arm", view="front",
        cmSpan=64, sided=True,
        regions=[("upper-arm", "shoulder to elbow", 32, 0.0, 0.50),
                 ("forearm", "elbow to wrist", 26, 0.50, 0.80)]),
    "07_left_leg.svg": dict(id="leg-shape-l", label="Leg", view="front",
        cmSpan=72, sided=False, regions=[]),
    "08_right_leg.svg": dict(id="leg-shape-r", label="Leg", view="front",
        cmSpan=72, sided=False, regions=[]),
}
BROKEN = ["01_head.svg", "06_hips.svg"]

NUM = re.compile(r"-?\d+\.?\d*")

def all_points(svg_text):
    pts = []
    for d in re.findall(r'<path d="([^"]+)"/>', svg_text):
        nums = [float(x) for x in NUM.findall(d)]
        pts += list(zip(nums[0::2], nums[1::2]))
    return pts

def envelope(pts, y0, y1, n=28):
    buckets = [[] for _ in range(n + 1)]
    for x, y in pts:
        if y1 == y0:
            continue
        t = (y - y0) / (y1 - y0)
        if -0.02 <= t <= 1.02:
            i = min(n, max(0, round(t * n)))
            buckets[i].append(x)
    sil = []
    for i, b in enumerate(buckets):
        if not b:
            continue
        sil.append({"y": round(y0 + (y1 - y0) * i / n, 1),
                    "left": round(min(b), 1), "right": round(max(b), 1)})
    return sil


def build():
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {}
    for fname, spec in GOOD.items():
        text = (SRC / fname).read_text()
        vb = re.search(r'viewBox="0 0 (\d+) (\d+)"', text)
        w, h = int(vb[1]), int(vb[2])
        pts = all_points(text)
        ys = [y for _, y in pts]
        y0, y1 = min(ys), max(ys)
        px_per_cm = (y1 - y0) / spec["cmSpan"]

        # ship the artwork mostly as-authored: swap the hardcoded ink colour for a
        # themeable CSS variable, everything else untouched.
        svg = text.replace('fill="#111"', 'fill="var(--body-line, #111)"')
        out_name = f"{spec['id']}.svg"
        (OUT / out_name).write_text(svg)

        sil = envelope(pts, y0, y1)
        regions = []
        for rid, label, cm, f0, f1 in spec["regions"]:
            ry0, ry1 = y0 + (y1 - y0) * f0, y0 + (y1 - y0) * f1
            regions.append({"id": rid, "label": label,
                            "referenceDimension": {"label": label, "cm": cm},
                            "silhouette": envelope(pts, ry0, ry1, 14)})

        manifest[spec["id"]] = {
            "art": out_name, "view": spec["view"], "sided": spec["sided"],
            "canvas": {"width": w, "height": h},
            "viewBox": [0, 0, w, h],
            "pxPerCm": round(px_per_cm, 3),
            "lengthCm": spec["cmSpan"],
            "silhouette": sil,
            "regions": regions,
        }
        print(f"{fname:24} -> {out_name:16} {w}x{h}px  {spec['cmSpan']}cm  "
              f"{px_per_cm:.2f}px/cm  {len(pts)} pts  {len(sil)} sil samples")

    for b in BROKEN:
        print(f"{b:24} -> SKIPPED (solid fill, not an outline trace)")
    print("04_right_arm.svg          -> MISSING (mirroring left arm as placeholder)")

    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")

if __name__ == "__main__":
    build()
