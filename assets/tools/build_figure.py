#!/usr/bin/env python3
"""
Generate the body figure: assets/figure/front.svg + regions.json

Neutral line art — outlines only, no fill colour, no skin tone. One figure, with
named REGIONS defined as viewBox windows into it, so zooming to "forearm" costs
nothing extra and there is only one drawing to get right.

Coordinates are centimetres on a 180 cm figure, mirrored about the centreline.
That means real-world scale is exact by construction: PX_PER_CM is the whole basis
of specs/004, and the sampled silhouette is the whole basis of specs/005.

    python3 assets/tools/build_figure.py
"""
import json, pathlib

PX_PER_CM = 10
CX_CM     = 45.0          # centreline
W, H      = 900, 1920     # canvas px
OUT       = pathlib.Path(__file__).resolve().parents[1] / "figure"

def X(x): return round(CX_CM * PX_PER_CM + x * PX_PER_CM, 1)   # cm right of centre
def Y(y): return round(y * PX_PER_CM, 1)

# ---------------------------------------------------------------- shapes
# 'sym'  : right half, centreline top -> centreline bottom; closed by mirroring.
# 'side' : a complete right-side shape; a mirrored copy is emitted for the left.

TORSO = [(0,22),(5.2,22.3),(5.8,27),(6.2,31),(7.6,33),(11,34.5),(15,36),(18.8,38),
         (20.5,42),(20.0,47),(19.5,52),(18.4,57),(17.0,62),(15.9,67),(16.0,72),
         (17.0,78),(18.2,84),(18.6,89),(18.2,93),(0,95)]

HEAD  = [(0,5),(4.6,5.9),(7.0,9.6),(7.6,14),(7.2,18.6),(6.3,22.2),(4.9,25.2),
         (2.9,27.3),(0,27.9)]

EAR   = [(7.0,13.2),(8.3,13.8),(8.7,16.0),(8.0,18.6),(7.0,19.2),(6.6,16.5)]

# The arm is drawn IN FRONT of the torso. Its inner edge runs from the armpit up to
# the trapezius, which is the deltoid line you see on the reference — so the join
# reads correctly instead of the arm floating beside the body.
ARM_OUT = [(11.0,34.2),(16.0,35.4),(20.5,37.5),(23.6,41.0),(24.8,45.5),(24.9,52),
           (24.9,60),(24.8,68),(25.2,75),(24.8,82),(23.9,90),(23.2,96),(24.2,101),
           (23.9,108),(22.8,113.5),(21.0,116.5)]
ARM_IN  = [(18.4,115.5),(17.0,113),(16.6,108),(16.9,101),(17.8,96),(17.2,90),
           (16.4,82),(16.2,75),(16.3,68),(16.6,60),(17.6,53),(19.8,47.5),
           (16.5,41),(11.0,34.2)]

LEG_OUT = [(18.4,88),(18.2,95),(17.6,102),(16.6,112),(15.4,122),(14.6,130),
           (14.3,135),(14.6,142),(14.4,150),(13.0,160),(11.3,170),(10.3,177),
           (10.9,183),(11.2,187)]
LEG_IN  = [(2.9,187),(3.1,183),(3.7,177),(3.8,170),(3.6,160),(3.5,150),
           (3.8,142),(4.3,135),(4.1,130),(3.6,122),(2.8,112),(2.0,102),
           (1.6,95),(1.5,88)]

SHORTS = [(0,83.5),(9,83.8),(16,84.5),(18.6,86.5),(19.4,93),(19.2,101),
          (18.6,110),(11.5,110.5),(5.0,110),(3.2,102),(0,96)]

SHAPES = [                       # drawn in order; later shapes occlude earlier ones
    ("leg",    "side", LEG_OUT + LEG_IN),
    ("torso",  "sym",  TORSO),
    ("shorts", "sym",  SHORTS),
    ("arm",    "side", ARM_OUT + ARM_IN),
    ("head",   "sym",  HEAD),
    ("ear",    "side", EAR),
]

DETAILS = [   # ("sym"|"center", points) — thin interior lines, as in the reference
    ("sym",    [(1.2,37.6),(6,36.6),(11,36.2),(15.5,37.4)]),        # clavicle
    ("sym",    [(1.6,52.8),(6,53.4),(11.5,51.6),(16.5,47.0),(18.8,44.0)]),  # pec
    ("sym",    [(4.2,28.5),(4.6,31),(4.8,33.2)]),                   # neck
    ("center", [(0,38.5),(0,52)]),                                  # sternum
    ("center", [(0,53),(0,71)]),                                    # linea alba
    ("sym",    [(1,57.5),(5,58),(8.6,57)]),                         # abs
    ("sym",    [(1,63),(5,63.5),(8.8,62.4)]),
    ("sym",    [(1,68.5),(4.6,69),(8,68)]),
    ("center", [(-0.9,72.0),(0,73.6),(0.9,72.0)]),                  # navel
    ("sym",    [(16.2,60),(14.9,68),(15.4,77)]),                    # oblique
    ("sym",    [(18.4,44),(17.2,52),(16.4,58)]),                    # lat
    ("sym",    [(0,86.8),(9,87.2),(18.7,88.6)]),                    # waistband
    ("center", [(0,97),(0,109)]),                                   # shorts crease
    ("sym",    [(12.2,109.4),(17.0,108.8)]),                        # shorts hem
    ("sym",    [(18.2,110),(19.0,104),(19.1,96)]),                  # side seam
    ("sym",    [(18.0,106),(18.4,112)]),                            # finger
    ("sym",    [(20.4,106),(20.7,113)]),
    ("sym",    [(22.6,105),(22.7,112)]),
    ("sym",    [(5.6,131.5),(9.2,130.8),(12.8,132.0)]),             # knee
    ("sym",    [(6.4,136.5),(12.0,136.0)]),
]

NIPPLES = [(6.5,52.5),(-6.5,52.5)]

# ---------------------------------------------------------------- regions
# Regions are viewBox windows into the one figure. A CHAIN is a run of regions that
# share a continuous surface, so a tattoo may span them: select forearm + upper arm
# and the silhouettes merge into one cylinder across the elbow. This is the whole
# reason for one figure rather than per-limb files — spanning across separate assets
# would mean stitching two coordinate systems together at every junction.
REGIONS = [
    dict(id="upper-arm", label="Upper arm", src="arm", chain="arm", sided=True,
         y=(38,70),   ref=("shoulder to elbow", 32), wrap=150),
    dict(id="forearm",   label="Forearm",   src="arm", chain="arm", sided=True,
         y=(70,96),   ref=("elbow to wrist", 26), wrap=150),
    dict(id="thigh",     label="Thigh",     src="leg", chain="leg", sided=True,
         y=(110,135), ref=("shorts hem to knee", 25), wrap=150),
    dict(id="calf",      label="Calf",      src="leg", chain="leg", sided=True,
         y=(135,177), ref=("knee to ankle", 42), wrap=150),
    dict(id="chest",     label="Chest",     src="torso", chain="torso", sided=False,
         y=(40,57),   ref=("collarbone to sternum", 17), wrap=105),
    dict(id="abdomen",   label="Stomach",   src="torso", chain="torso", sided=False,
         y=(57,84),   ref=("sternum to waist", 27), wrap=110),
]

# PARTS are what the customer picks. A part carries a rotation model:
#
#   "cylinder" — the surface is a stack of circular cross-sections, so the outline is
#                (near enough) the same from every angle and rotating only changes
#                WHICH skin faces the viewer. One drawing covers all 360 degrees, and
#                the tattoo just gets an angular position on the surface.
#   "views"    — the cross-section is nowhere near circular and front/back are
#                genuinely different drawings. Rotation has to step between discrete
#                views, which is why the mockup shows torso and back separately.
PARTS = [
    dict(id="head",  label="Head",         src="head",   y=(5,28),     rot="views",
         views=["front","back"], sided=False),
    dict(id="torso", label="Neck & torso", src="torso",  y=(22,95),    rot="views",
         views=["front","back"], sided=False),
    dict(id="hips",  label="Hips",         src="shorts", y=(83.5,110), rot="views",
         views=["front","back"], sided=False),
    dict(id="arm",   label="Arm",          src="arm",    y=(40,96),    rot="cylinder",
         wrap=360, sided=True),
    dict(id="leg",   label="Leg",          src="leg",    y=(92,177),   rot="cylinder",
         wrap=360, sided=True),
]

def interp(pts, y):
    """x at height y along a polyline given as (x, y) samples ordered by y."""
    pts = sorted(pts, key=lambda p: p[1])
    if y <= pts[0][1]:  return pts[0][0]
    if y >= pts[-1][1]: return pts[-1][0]
    for a, b in zip(pts, pts[1:]):
        if a[1] <= y <= b[1]:
            t = 0 if b[1] == a[1] else (y - a[1]) / (b[1] - a[1])
            return a[0] + (b[0] - a[0]) * t
    return pts[-1][0]

def edges(src, y):
    """(left_cm, right_cm) of a region's surface at height y."""
    if src == "arm":   return interp(ARM_IN, y),  interp(ARM_OUT, y)
    if src == "leg":   return interp(LEG_IN, y),  interp(LEG_OUT, y)
    if src == "torso":  return -interp(TORSO, y),  interp(TORSO, y)
    if src == "head":   return -interp(HEAD, y),   interp(HEAD, y)
    if src == "shorts": return -interp(SHORTS, y), interp(SHORTS, y)
    raise ValueError(src)

# ---------------------------------------------------------------- path building
def catmull(P):
    out = []
    for i in range(len(P) - 1):
        p0, p1, p2, p3 = P[max(i-1,0)], P[i], P[i+1], P[min(i+2,len(P)-1)]
        c1 = (p1[0]+(p2[0]-p0[0])/6, p1[1]+(p2[1]-p0[1])/6)
        c2 = (p2[0]-(p3[0]-p1[0])/6, p2[1]-(p3[1]-p1[1])/6)
        out.append("C %.1f %.1f, %.1f %.1f, %.1f %.1f" % (*c1, *c2, *p2))
    return " ".join(out)

def to_px(pts, flip=False):
    return [(X(-p[0] if flip else p[0]), Y(p[1])) for p in pts]

def closed(pts, kind, flip=False):
    if kind == "sym":
        pts = pts + [(-x, y) for x, y in reversed(pts[1:-1])]
    P = to_px(pts, flip)
    return "M %.1f %.1f " % P[0] + catmull(P + [P[0]]) + " Z"

def open_path(pts, flip=False):
    P = to_px(pts, flip)
    return "M %.1f %.1f " % P[0] + catmull(P)

# ---------------------------------------------------------------- emit
def build():
    body, details = [], []

    for name, kind, pts in SHAPES:
        if kind == "sym":
            body.append(f'<path class="fill" d="{closed(pts, "sym")}"/>')
        else:
            body.append(f'<path class="fill" d="{closed(pts, "side")}"/>')
            body.append(f'<path class="fill" d="{closed(pts, "side", flip=True)}"/>')

    for kind, pts in DETAILS:
        if kind == "center":
            details.append(f'<path d="{open_path(pts)}"/>')
        else:
            details.append(f'<path d="{open_path(pts)}"/>')
            details.append(f'<path d="{open_path(pts, flip=True)}"/>')
    for x, y in NIPPLES:
        details.append(f'<circle cx="{X(x)}" cy="{Y(y)}" r="{0.55*PX_PER_CM:.1f}"/>')

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="Neutral line drawing of a human figure, front view">
  <style>
    .fill  {{ fill: var(--body-fill, #fff); stroke: var(--body-line, #1a1a1a);
              stroke-width: 2.6; stroke-linejoin: round; }}
    .detail{{ fill: none; stroke: var(--body-line, #1a1a1a); stroke-width: 1.7;
              stroke-linecap: round; stroke-linejoin: round; opacity: .85; }}
    .detail circle {{ fill: none; }}
  </style>
  <g class="body">
{chr(10).join("    " + b for b in body)}
  </g>
  <g class="detail">
{chr(10).join("    " + d for d in details)}
  </g>
</svg>
'''

    CXPX = CX_CM * PX_PER_CM
    def mirror_sil(sil):
        return [{"y": p["y"], "left": round(2*CXPX - p["right"], 1),
                 "right": round(2*CXPX - p["left"], 1)} for p in sil]

    def window(sils, y0, y1):
        xs = [v for s_ in sils for p in s_ for v in (p["left"], p["right"])]
        pad = 0.10 * (max(xs) - min(xs)) + 24
        return [round(min(xs)-pad,1), Y(y0)-40,
                round(max(xs)-min(xs)+2*pad,1), Y(y1-y0)+80]

    regions, chains = [], {}
    for r in REGIONS:
        y0, y1 = r["y"]
        span = y1 - y0
        label, cm = r["ref"]
        assert abs(span - cm) < 0.01, f"{r['id']}: {span}cm span vs {cm}cm reference"
        sil = []
        for i in range(11):
            y = y0 + i * span / 10
            l, rr = edges(r["src"], y)
            sil.append({"y": Y(y), "left": X(l), "right": X(rr)})

        variants = [("-r", sil, r["label"]), ("-l", mirror_sil(sil), r["label"])] \
                   if r["sided"] else [("", sil, r["label"])]
        for suffix, sl, lbl in variants:
            rid   = r["id"] + suffix
            chain = r["chain"] + suffix
            regions.append({
                "id": rid, "label": lbl,
                "side": {"-r": "right", "-l": "left"}.get(suffix, "centre"),
                "chain": chain,
                "viewBox": window([sl], y0, y1),
                "pxPerCm": PX_PER_CM,
                "referenceDimension": {"label": label, "cm": cm, "px": Y(span)},
                "surface": {"model": "cylinder", "wrapDegrees": r["wrap"],
                            "silhouette": sl},
            })
            chains.setdefault(chain, []).append(rid)

    # A chain's merged surface: silhouettes concatenated and de-duplicated by y, so a
    # span across a joint gets one continuous cylinder whose radius varies with height.
    chain_out = {}
    for cid, ids in chains.items():
        members = [x for x in regions if x["id"] in ids]
        members.sort(key=lambda m: m["surface"]["silhouette"][0]["y"])
        merged, seen = [], set()
        for m in members:
            for p in m["surface"]["silhouette"]:
                if p["y"] not in seen:
                    seen.add(p["y"]); merged.append(p)
        merged.sort(key=lambda p: p["y"])
        ys = [p["y"] for p in merged]
        chain_out[cid] = {
            "id": cid, "regions": ids,
            "viewBox": window([merged], ys[0]/PX_PER_CM, ys[-1]/PX_PER_CM),
            "surface": {
                "model": "cylinder",
                "wrapDegrees": round(sum(m["surface"]["wrapDegrees"]
                                         for m in members) / len(members)),
                "silhouette": merged,
            },
        }

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "front.svg").write_text(svg)
    parts = []
    for pt in PARTS:
        y0, y1 = pt["y"]
        sil = []
        for i in range(13):
            y = y0 + i * (y1-y0) / 12
            l, r = edges(pt["src"], y)
            sil.append({"y": Y(y), "left": X(l), "right": X(r)})
        variants = [("-r", sil), ("-l", mirror_sil(sil))] if pt["sided"] else [("", sil)]
        for suffix, sl in variants:
            side = {"-r": "right", "-l": "left"}.get(suffix, "centre")
            parts.append({
                "id": pt["id"] + suffix,
                "label": (f"{side.capitalize()} {pt['label'].lower()}"
                          if pt["sided"] else pt["label"]),
                "lengthCm": round(y1 - y0, 1),
                "viewBox": window([sl], y0, y1),
                "rotation": ({"model": "cylinder", "degrees": 360}
                             if pt["rot"] == "cylinder"
                             else {"model": "views", "views": pt["views"]}),
                "surface": {"model": "cylinder", "silhouette": sl},
            })

    (OUT / "regions.json").write_text(json.dumps(
        {"figure": {"art": "front.svg", "heightCm": 180,
                    "canvas": {"width": W, "height": H}, "pxPerCm": PX_PER_CM},
         "parts": parts, "chains": chain_out, "regions": regions},
        indent=2) + "\n")

    print(f"front.svg  {W}x{H}  {PX_PER_CM} px/cm  180 cm figure")
    for r in regions:
        rd = r["referenceDimension"]
        print(f"  {r['id']:14} {rd['label']:24} {rd['cm']:>3} cm  "
              f"({rd['px']:.0f} px)  OK")
    print("  parts (what the customer picks):")
    for pt in parts:
        rot = pt["rotation"]
        how = ("360 continuous" if rot["model"] == "cylinder"
               else "views: " + "/".join(rot["views"]))
        print(f"    {pt['id']:8} {pt['label']:18} {pt['lengthCm']:>5} cm  {how}")
    print("  chains (a tattoo may span within one):")
    for cid, c in chain_out.items():
        sl = c["surface"]["silhouette"]
        cm = (sl[-1]["y"] - sl[0]["y"]) / PX_PER_CM
        print(f"    {cid:10} {' + '.join(c['regions']):34} {cm:>5.0f} cm continuous")

if __name__ == "__main__":
    build()
