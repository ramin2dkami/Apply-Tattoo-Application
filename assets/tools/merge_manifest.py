#!/usr/bin/env python3
"""
Merge the procedural figure (assets/figure/regions.json, from build_figure.py) with
the real traced artwork (assets/figure/real/manifest.json, from trace_geometry.py)
into one file the app reads: assets/figure/combined.json.

Every part keeps its PROCEDURAL geometry (used when several parts are selected
together, since only the assembled front/back figure gives them a shared coordinate
space) and, where we have a good trace, a REAL overlay (used when that part is the
only one selected, so the customer sees the actual reference artwork rather than a
crop of the assembled body).

Run after both build_figure.py and trace_geometry.py.
"""
import json, pathlib

F = pathlib.Path(__file__).resolve().parents[1] / "figure"
proc = json.loads((F / "regions.json").read_text())
real = json.loads((F / "real" / "manifest.json").read_text())

# maps a procedural part id to the real-art id it should borrow from
REAL_FOR = {
    "torso": "torso", "back": "back",
    "arm-l": "arm", "arm-r": "arm",
    "leg-l": "leg-shape-l", "leg-r": "leg-shape-r",
}
MIRROR_REAL = {"arm-r"}  # real art is authored as the left limb; mirror for the right

def mirror_sil(sil, width):
    return [{"y": p["y"], "left": round(width - p["right"], 1),
             "right": round(width - p["left"], 1)} for p in sil]

out_parts = []
for p in proc["parts"]:
    entry = dict(p)
    rid = REAL_FOR.get(p["id"])
    if rid and rid in real:
        r = real[rid]
        w = r["canvas"]["width"]
        sil = mirror_sil(r["silhouette"], w) if p["id"] in MIRROR_REAL else r["silhouette"]
        entry["real"] = {
            "art": f"real/{r['art']}", "view": r["view"],
            "viewBox": r["viewBox"], "pxPerCm": r["pxPerCm"],
            "silhouette": sil,
            # The silhouette above is already mirrored (mirror_sil); the drawing
            # itself must be flipped to match, or a "Right arm" selection shows the
            # left-arm artwork unmirrored — visually wrong regardless of correct math.
            "mirror": p["id"] in MIRROR_REAL,
        }
    out_parts.append(entry)

combined = {**proc, "parts": out_parts}
(F / "combined.json").write_text(json.dumps(combined, indent=2) + "\n")
print(f"combined.json: {len(out_parts)} parts, "
      f"{sum(1 for p in out_parts if 'real' in p)} with real art")
