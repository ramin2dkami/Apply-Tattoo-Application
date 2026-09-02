#!/usr/bin/env python3
"""
Generate the body art: individual parts + the assembled picker figure.

Neutral line art, outlines only. Everything derives from one table of anatomy in
CENTIMETRES, mirrored about the centreline, so real-world scale is exact by
construction (specs/004) and the sampled silhouette drives the contour warp
(specs/005).

Two figures come out of the one generator (specs/009): the male figure (180 cm, in
assets/figure/) and the female one (165 cm, in assets/figure/female/). The female
anatomy is DERIVED from the male tables — heights by one factor, limbs by their own
centre/width factors, the torso by a per-height width factor — so the two can't drift
apart structurally, and the female silhouette really is female where it matters: the
outline that the contour warp reads.

Parts are drawn in isolation — a clean whole limb, not a crop of a body — and the same
shapes are assembled into the picker figure. One source, two renderings, no drift.

    python3 assets/tools/build_figure.py
"""
import json, math, pathlib

PX_PER_CM = 10
CX_CM     = 45.0
W, H      = 900, 1980
OUT       = pathlib.Path(__file__).resolve().parents[1] / "figure"

def X(x): return round(CX_CM * PX_PER_CM + x * PX_PER_CM, 1)
def Y(y): return round(y * PX_PER_CM, 1)

# ---------------------------------------------------------------- limb profiles
# (height, centre offset from midline, width) — all centimetres. Widths are real
# anatomy: a 10 cm knee, an 11 cm calf, a 5.4 cm wrist.

ARM_PROFILE = [
    (36.0, 19.2,  9.6), (39.0, 19.6, 11.2), (43.0, 20.0, 11.8),    # deltoid
    (48.0, 20.2, 10.8), (54.0, 20.4,  9.6), (61.0, 20.6,  8.6),
    (68.0, 20.8,  7.9), (70.5, 20.9,  7.7),                        # elbow, narrowest
    (74.0, 21.1,  8.6), (79.0, 21.2,  8.3),                        # forearm belly
    (85.0, 21.1,  7.1), (92.0, 20.9,  5.8), (96.0, 20.8,  5.3),    # wrist
    (99.0, 20.8,  7.6), (104.0, 20.7, 8.4), (109.0, 20.6, 8.0),    # hand
    (113.0, 20.4, 6.4), (116.5, 20.2, 3.8),
]

LEG_PROFILE = [
    (88.0, 10.0, 17.4), (94.0, 10.0, 17.0), (101.0, 9.9, 16.0),
    (110.0, 9.8, 14.3), (120.0, 9.6, 12.2), (128.0, 9.4, 10.8),
    (133.0,  9.3, 10.1),                                            # knee
    (139.0,  9.2, 10.9), (147.0, 9.0, 11.2),                        # calf
    (156.0,  8.6,  9.6), (165.0, 8.0,  7.8), (172.0, 7.4, 6.7),
    (177.0,  7.1,  6.3),                                            # ankle
    (181.0,  7.2,  7.4), (185.0, 7.6, 9.2), (188.0, 7.9, 9.8),
    (190.0,  8.0,  9.2),                                            # toes
]

def limb(profile, round_top, round_bottom, bulge=0.42, top_drop=0.0):
    """Closed outline from a profile, with optional rounded caps. Rounding matters:
    a flat-topped shoulder reads as amputation when the part is shown on its own.

    `top_drop` slopes the top edge instead: the inner corner starts that many
    centimetres lower than the outer one. A thigh joins the body along a diagonal —
    hip point high, crotch low — so a flat top is the one thing that cannot be drawn
    over the hips without reading as a hem."""
    out = [(c + w / 2, y) for y, c, w in profile]
    inn = [(c - w / 2, y) for y, c, w in profile]
    if top_drop:
        ytop = profile[0][0] + top_drop
        x = interp([(c - w / 2, y) for y, c, w in profile], ytop)
        inn = [(x, ytop)] + [q for q in inn if q[1] > ytop]
    pts = []
    if round_top:
        y0, c0, w0 = profile[0]
        for i in range(9):
            a = math.pi - math.pi * i / 8
            pts.append((c0 + (w0 / 2) * math.cos(a), y0 - (w0 * bulge) * math.sin(a)))
    else:
        pts.append(inn[0]); pts.append(out[0])
    pts += out[1:]
    if round_bottom:
        y1, c1, w1 = profile[-1]
        for i in range(1, 9):
            a = -math.pi * i / 8
            pts.append((c1 + (w1 / 2) * math.cos(a), y1 - (w1 * bulge) * math.sin(a)))
    pts += inn[::-1][1:]
    return pts

# thumb, on the inner side of the hand
THUMB = [(17.6, 97.8), (16.5, 99.6), (15.9, 102.4), (16.5, 105.2),
         (17.8, 105.8), (18.6, 103.4), (18.8, 99.8)]

# ---------------------------------------------------------------- body shapes
TORSO = [(0,20),(5.2,20.4),(5.6,25),(6.0,29),(6.6,31.5),(9.0,33),(13.5,34.2),
         (17.5,35.6),(20.8,37.6),(22.4,41),(22.6,45),(21.4,49),(19.6,52),
         (18.6,56),(17.6,60),(16.4,65),(15.4,70),(15.2,74),(15.9,79),(17.0,84),
         (19.0,89),(19.4,93),(18.6,97),(4.0,99.6),(0,100.2)]

NECK  = [(0,22),(5.2,22.4),(5.6,27),(6.0,31),(7.0,33.5),(0,34)]

HEAD  = [(0,3.5),(4.8,4.4),(7.2,8.2),(7.8,12.8),(7.4,17.6),(6.6,21.4),
         (5.4,24.6),(3.4,27.2),(0,28.2)]

EAR   = [(7.0,13.0),(8.4,13.6),(8.8,16.2),(8.1,19.0),(7.0,19.6),(6.6,16.6)]

# Surface half-widths across the hips, as its own MONOTONE profile. The hips are not
# a single drawn outline — above the crotch they are the bottom of the torso, below it
# they are two thighs side by side — and a closed outline that doubles back cannot be
# read as "left and right edge at height y" anyway: sampling it that way collapses the
# radius to nothing on the rows where it reverses, which the contour warp then renders
# as a tattoo torn into bands. Across this span the body is about one width, so one
# cylinder is still the right model.
HIP_SURF = [(17.0,84.0),(19.0,89.0),(19.4,93.0),(18.6,97.0),
            (18.0,100.0),(17.5,104.0)]

# ---------------------------------------------------------------- surface detail
# Grouped by part so a part drawn on its own gets exactly its own anatomy.

D_ARM = [
    ("side", [(16.2,39.5),(18.2,44.5),(20.6,50.0)]),                  # deltoid
    ("side", [(18.2,47.0),(17.7,56.0),(17.9,65.0)]),                  # biceps, inner
    ("side", [(24.2,47.0),(24.4,56.0),(24.0,65.0)]),                  # triceps edge
    ("side", [(17.6,70.4),(20.0,71.8),(22.6,70.6)]),                  # elbow crease
    ("side", [(19.8,78.0),(20.2,86.0),(20.4,93.0)]),                  # flexor
    ("side", [(23.6,77.0),(23.2,86.0),(22.8,93.0)]),                  # ulna ridge
    ("side", [(18.4,96.3),(20.8,97.3),(23.2,96.3)]),                  # wrist
    ("side", [(16.9,105.6),(20.7,104.4),(24.5,105.6)]),               # knuckles
    ("side", [(18.3,106.6),(18.7,113.4)]),                            # fingers
    ("side", [(20.7,106.6),(20.8,114.4)]),
    ("side", [(23.0,106.8),(22.8,113.2)]),
]

D_LEG = [
    ("side", [(15.8,104.0),(14.5,116.0),(13.2,126.0)]),               # outer thigh
    ("side", [(4.6,104.0),(5.6,116.0),(6.4,127.0)]),                  # inner thigh
    ("side", [(6.5,129.6),(9.4,128.4),(12.4,130.0)]),                 # knee
    ("side", [(7.0,135.0),(11.8,134.6)]),
    ("side", [(8.8,140.0),(9.2,152.0),(8.8,166.0)]),                  # shin
    ("side", [(4.6,142.0),(4.2,154.0),(5.0,168.0)]),                  # calf, inner
    ("side", [(13.2,144.0),(12.8,154.0),(11.4,165.0)]),               # calf, outer
    ("side", [(9.7,174.6),(10.3,177.2)]),                             # ankle bone
    ("side", [(3.4,185.2),(7.7,183.9),(12.0,185.4)]),                 # toe line
    ("side", [(4.3,186.2),(4.2,189.6)]),
    ("side", [(6.2,185.0),(6.1,190.2)]),
    ("side", [(8.0,184.9),(8.1,190.3)]),
    ("side", [(9.9,185.3),(10.0,189.8)]),
]

D_TORSO = [
    ("sym",    [(4.2,26.5),(4.6,29.5),(5.0,32.0)]),                   # neck
    ("sym",    [(1.4,37.6),(7.0,36.4),(12.6,36.2),(17.8,38.0)]),      # collarbone
    ("sym",    [(6.6,32.8),(11.4,34.2),(16.2,36.0)]),                 # trapezius
    ("sym",    [(1.6,52.4),(6.8,53.2),(12.4,51.0),(17.4,46.4),(20.4,42.8)]),  # pec
    ("sym",    [(2.2,41.0),(2.6,47.0),(2.0,51.6)]),                   # pec inner
    ("center", [(0,38.0),(0,51.0)]),                                  # sternum
    ("center", [(0,52.0),(0,70.0)]),                                  # linea alba
    ("sym",    [(1.0,56.5),(4.6,57.0),(8.0,56.0)]),                   # abs
    ("sym",    [(1.0,61.5),(4.8,62.0),(8.4,61.0)]),
    ("sym",    [(1.0,66.5),(4.6,67.0),(7.8,66.0)]),
    ("sym",    [(1.0,71.5),(4.0,72.0),(6.8,71.0)]),
    ("center", [(-0.9,70.4),(0,72.0),(0.9,70.4)]),                    # navel
    ("sym",    [(12.2,53.0),(13.2,57.5),(13.8,62.5)]),                # serratus
    ("sym",    [(16.6,59.0),(15.0,68.0),(15.8,77.0)]),                # flank
    ("sym",    [(6.0,86.0),(11.2,90.2),(16.2,93.4)]),                 # inguinal
]

# Nothing. The inguinal crease at the hips is the thigh's own top edge — drawing a
# line there as well just crosses it, which is what the old waistband-and-seams
# version did. The silhouette carries the anatomy.
D_HIPS = []

D_BACK = [
    ("sym",    [(3.2,29.0),(3.7,31.5),(4.0,33.5)]),                   # neck
    ("sym",    [(4.0,37.0),(8.5,39.0),(13.5,42.0)]),                  # trapezius
    ("sym",    [(6.0,44.0),(9.2,52.0),(9.6,60.0),(7.8,66.0)]),        # scapula
    ("center", [(0,36.0),(0,84.0)]),                                  # spine
    ("sym",    [(1.4,58.0),(4.6,62.0),(6.6,70.0),(7.6,80.0)]),        # lat
    ("sym",    [(1.2,79.0),(4.8,81.5),(8.0,80.0)]),                   # lower back
    ("sym",    [(14.6,52.0),(14.0,60.0),(15.0,70.0)]),                # flank
]

D_HEAD = [
    ("sym", [(4.2,26.5),(4.6,29.5),(5.0,32.0)]),                      # neck
]

NIPPLES = [(6.8, 51.8), (-6.8, 51.8)]

# ---------------------------------------------------------------- female anatomy
# Derived, never re-authored: same landmarks, different proportions. SY sets the
# height (165 cm); the limbs take their own centre/width factors; the torso takes a
# per-height width factor so the waist comes in and the hips go out where they should,
# which is what makes the SILHOUETTE — and therefore the contour warp — female rather
# than a male one scaled down.
SY = 165.0 / 180.0

ARM_SC, ARM_SW = 0.92, 0.88      # narrower shoulders, slimmer arm
LEG_SC, LEG_SW = 1.02, 0.96      # legs set slightly wider, off the wider hips
HEAD_SX, NECK_SX, HIP_SX = 0.94, 0.90, 1.08

# male height (cm) -> horizontal factor on the torso outline
TORSO_WF = [(20,0.88),(33,0.90),(45,0.90),(49,0.97),(53,0.99),(56,0.92),(60,0.88),
            (65,0.84),(70,0.83),(74,0.86),(79,0.96),(84,1.06),(89,1.12),(93,1.14),
            (99,1.12)]

def factor_at(table, y):
    if y <= table[0][0]:  return table[0][1]
    if y >= table[-1][0]: return table[-1][1]
    for a, b in zip(table, table[1:]):
        if a[0] <= y <= b[0]:
            t = 0 if b[0] == a[0] else (y - a[0]) / (b[0] - a[0])
            return a[1] + (b[1] - a[1]) * t
    return table[-1][1]

def f_profile(profile, sc, sw):
    return [(round(y*SY, 2), round(c*sc, 2), round(w*sw, 2)) for y, c, w in profile]

def f_pts(pts, sx):
    return [(round(x*sx, 2), round(y*SY, 2)) for x, y in pts]

def f_torso_pts(pts):
    """Torso-family points: the horizontal factor varies with height, so detail lines
    transform exactly the way the outline they sit on does."""
    return [(round(x * factor_at(TORSO_WF, y), 2), round(y*SY, 2)) for x, y in pts]

def f_details(details, sx):
    return [(kind, f_pts(pts, sx)) for kind, pts in details]

def f_torso_details(details):
    return [(kind, f_torso_pts(pts)) for kind, pts in details]

ARM_PROFILE_F = f_profile(ARM_PROFILE, ARM_SC, ARM_SW)
LEG_PROFILE_F = f_profile(LEG_PROFILE, LEG_SC, LEG_SW)
THUMB_F  = f_pts(THUMB, ARM_SC)
TORSO_F  = f_torso_pts(TORSO)
NECK_F   = f_pts(NECK, NECK_SX)
HEAD_F   = f_pts(HEAD, HEAD_SX)
EAR_F    = f_pts(EAR, HEAD_SX)
HIP_SURF_F = f_pts(HIP_SURF, HIP_SX)

# Chest linework is the one place a transform can't help: pecs are not breasts. The
# rest of the torso detail is the male set put through the same transform as the
# outline, so nothing floats off the drawing.
D_TORSO_F = [
    ("sym",    f_torso_pts(D_TORSO[0][1])),                           # neck
    ("sym",    f_torso_pts(D_TORSO[1][1])),                           # collarbone
    ("sym",    f_torso_pts(D_TORSO[2][1])),                           # trapezius
    ("sym",    [(2.4,42.2),(5.6,45.4),(9.8,45.9),(13.0,42.6)]),       # under-bust
    ("sym",    [(2.8,39.0),(6.4,40.6),(10.6,40.8)]),                  # upper breast
    ("center", [(0,38.0),(0,44.0)]),                                  # sternum
    ("center", f_torso_pts(D_TORSO[6][1])),                           # linea alba
    ("sym",    f_torso_pts(D_TORSO[8][1])),                           # one ab line
    ("center", f_torso_pts(D_TORSO[11][1])),                          # navel
    ("sym",    f_torso_pts(D_TORSO[13][1])),                          # flank / waist
    ("sym",    f_torso_pts(D_TORSO[14][1])),                          # inguinal
]

# ---------------------------------------------------------------- variants
def anatomy_male():
    arm = limb(ARM_PROFILE, True,  True,  0.40)
    leg = limb(LEG_PROFILE, False, True,  0.32, top_drop=9.0)
    return dict(
        key="male", label="Male", out=OUT, art_prefix="", sy=1.0,
        height_cm=180, canvas_h=H,
        shapes={
            "leg": ("side", leg), "arm": ("side", arm), "thumb": ("side", THUMB),
            "torso": ("sym", TORSO), "neck": ("sym", NECK),
            "head": ("sym", HEAD), "ear": ("side", EAR),
        },
        details={"arm": D_ARM, "leg": D_LEG, "torso": D_TORSO, "hips": D_HIPS,
                 "back": D_BACK, "head": D_HEAD},
        profiles={"arm": ARM_PROFILE, "leg": LEG_PROFILE},
        outlines={"torso": TORSO, "head": HEAD, "hipsurf": HIP_SURF},
        nipples=NIPPLES,
    )

def anatomy_female():
    arm = limb(ARM_PROFILE_F, True,  True,  0.40)
    leg = limb(LEG_PROFILE_F, False, True,  0.32, top_drop=9.0 * SY)
    return dict(
        key="female", label="Female", out=OUT / "female", art_prefix="female/", sy=SY,
        height_cm=165, canvas_h=round(H * SY),
        shapes={
            "leg": ("side", leg), "arm": ("side", arm), "thumb": ("side", THUMB_F),
            "torso": ("sym", TORSO_F), "neck": ("sym", NECK_F),
            "head": ("sym", HEAD_F), "ear": ("side", EAR_F),
        },
        details={"arm": f_details(D_ARM, ARM_SC), "leg": f_details(D_LEG, LEG_SC),
                 "torso": D_TORSO_F, "hips": f_details(D_HIPS, HIP_SX),
                 "back": f_torso_details(D_BACK), "head": f_details(D_HEAD, NECK_SX)},
        profiles={"arm": ARM_PROFILE_F, "leg": LEG_PROFILE_F},
        outlines={"torso": TORSO_F, "head": HEAD_F, "hipsurf": HIP_SURF_F},
        nipples=None,
    )

VARIANTS = [anatomy_male, anatomy_female]

# ---------------------------------------------------------------- parts
# shapes/details drawn when the part stands alone; `surf` is the cylinder range used
# by the warp, deliberately narrower than the drawing (a hand is not a cylinder).
# All heights are MALE centimetres; each variant scales them by its own sy.
PARTS_DEF = [
    dict(id="head",  label="Head",         sided=False, view="front",
         shapes=["neck","head","ear"], details="head",
         y=(2.5,35), surf=("head",(6,26)), rot="views"),
    dict(id="torso", label="Neck & torso", sided=False, view="front",
         shapes=["torso"], details="torso", nipples=True,
         y=(19,99), surf=("torso",(40,84)), rot="views"),
    dict(id="back",  label="Back",         sided=False, view="back",
         shapes=["arm","torso","neck","head","ear"], details="back",
         y=(2.5,99), surf=("torso",(40,84)), rot="views"),
    dict(id="hips",  label="Hips",         sided=False, view="front",
         shapes=["torso","leg"], details="hips",
         y=(80,112), surf=("hipsurf",(84,104)), rot="views"),
    dict(id="arm",   label="Arm",          sided=True,  view="front",
         shapes=["arm","thumb"], details="arm",
         y=(33,119), surf=("arm",(40,96)), rot="cylinder"),
    dict(id="leg",   label="Leg",          sided=True,  view="front",
         shapes=["leg"], details="leg",
         y=(86,192), surf=("leg",(92,177)), rot="cylinder"),
]

# assembled picker figure: back-to-front
# Legs go over the torso, whose outline runs all the way down to the crotch. What
# shows at the hips is then the thigh's own sloped top edge — the inguinal crease —
# instead of a line drawn across the thighs, which is what read as underwear.
FIGURE_STACK = ["arm", "torso", "leg", "neck", "head", "ear"]

REGIONS = [
    dict(id="upper-arm", label="Upper arm", src="arm", chain="arm", sided=True,
         y=(38,70),   ref=("shoulder to elbow", 32), wrap=150),
    dict(id="forearm",   label="Forearm",   src="arm", chain="arm", sided=True,
         y=(70,96),   ref=("elbow to wrist", 26), wrap=150),
    dict(id="thigh",     label="Thigh",     src="leg", chain="leg", sided=True,
         y=(110,135), ref=("hip crease to knee", 25), wrap=150),
    dict(id="calf",      label="Calf",      src="leg", chain="leg", sided=True,
         y=(135,177), ref=("knee to ankle", 42), wrap=150),
    dict(id="chest",     label="Chest",     src="torso", chain="torso", sided=False,
         y=(40,57),   ref=("collarbone to sternum", 17), wrap=105),
    dict(id="abdomen",   label="Stomach",   src="torso", chain="torso", sided=False,
         y=(57,84),   ref=("sternum to waist", 27), wrap=110),
]

# ---------------------------------------------------------------- path helpers
def interp(pts, y):
    pts = sorted(pts, key=lambda p: p[1])
    if y <= pts[0][1]:  return pts[0][0]
    if y >= pts[-1][1]: return pts[-1][0]
    for a, b in zip(pts, pts[1:]):
        if a[1] <= y <= b[1]:
            t = 0 if b[1] == a[1] else (y - a[1]) / (b[1] - a[1])
            return a[0] + (b[0] - a[0]) * t
    return pts[-1][0]

def outline_half(pts, y):
    """Outermost half-width of a closed half-outline at height y.

    interp() walks the points as if they only ever descend, which is true of a limb
    profile and false of any outline that doubles back. Crossing the whole closed polygon and keeping the outermost hit is
    correct for both, so the silhouette never collapses mid-shape.
    """
    P = list(pts) + [pts[0]]
    xs = []
    for (x0, y0), (x1, y1) in zip(P, P[1:]):
        if y0 == y1:
            if abs(y - y0) < 1e-9:
                xs += [x0, x1]
        elif min(y0, y1) <= y <= max(y0, y1):
            xs.append(x0 + (x1 - x0) * (y - y0) / (y1 - y0))
    return max(xs) if xs else 0.0

def edges(A, src, y):
    """Left/right edge of a source shape at height y, in this variant's anatomy."""
    if src in A["profiles"]:
        prof = A["profiles"][src]
        inner = [(c - w / 2, yy) for yy, c, w in prof]
        outer = [(c + w / 2, yy) for yy, c, w in prof]
        return interp(inner, y), interp(outer, y)
    if src in A["outlines"]:
        half = outline_half(A["outlines"][src], y)
        return -half, half
    raise ValueError(src)

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

CSS = """
    .figFill  { fill: var(--body-fill, #fff); stroke: var(--body-line, #1a1a1a);
                stroke-width: 2.6; stroke-linejoin: round; }
    .figDetail{ fill: none; stroke: var(--body-line, #1a1a1a); stroke-width: 1.7;
                stroke-linecap: round; stroke-linejoin: round; opacity: .8; }
    .figDetail circle { fill: none; }"""

# The profiles are authored on the +x side of the midline, which is the VIEWER's right.
# A person's right limb appears there mirrored, so anatomical right is the flipped one.
MIRROR = {"r": True, "l": False}

def render(A, shape_names, details, view_box, label, nipples=False, only_side=None):
    body, det = [], []
    for name in shape_names:
        kind, pts = A["shapes"][name]
        if kind == "sym":
            body.append(f'<path class="figFill" d="{closed(pts, "sym")}"/>')
        else:
            sides = [only_side] if only_side else ["r", "l"]
            for s in sides:
                body.append(f'<path class="figFill" d="{closed(pts, "side", flip=MIRROR[s])}"/>')
    for kind, pts in details:
        if kind == "center":
            det.append(f'<path d="{open_path(pts)}"/>')
        elif kind == "sym":
            det.append(f'<path d="{open_path(pts)}"/>')
            det.append(f'<path d="{open_path(pts, flip=True)}"/>')
        else:
            sides = [only_side] if only_side else ["r", "l"]
            for s in sides:
                det.append(f'<path d="{open_path(pts, flip=MIRROR[s])}"/>')
    if nipples and A["nipples"]:
        for x, y in A["nipples"]:
            det.append(f'<circle cx="{X(x)}" cy="{Y(y * A["sy"])}" r="{0.5*PX_PER_CM:.1f}"/>')

    vb = " ".join(f"{v:.1f}" for v in view_box)
    # "Neck & torso" has to be escaped or the file isn't well-formed XML — the app
    # inlines the markup and never notices, but any SVG viewer refuses to open it.
    label = label.replace("&", "&amp;")
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" role="img" aria-label="{label}">
  <style>{CSS}
  </style>
  <g class="figBody">
{chr(10).join("    " + b for b in body)}
  </g>
  <g class="figDetail">
{chr(10).join("    " + d for d in det)}
  </g>
</svg>
'''

def bounds(A, shape_names, only_side, y0, y1, pad=18):
    xs = []
    for name in shape_names:
        kind, pts = A["shapes"][name]
        for x, y in pts:
            if not (y0 - 6 <= y <= y1 + 6):
                continue
            if kind == "sym" or only_side is None:
                xs += [X(x), X(-x)]
            else:
                xs.append(X(-x) if MIRROR[only_side] else X(x))
    if not xs:
        xs = [X(-20), X(20)]
    return [min(xs) - pad, Y(y0), max(xs) - min(xs) + 2 * pad, Y(y1 - y0)]

# ---------------------------------------------------------------- build
def build_variant(A):
    out_dir = A["out"]
    out_dir.mkdir(parents=True, exist_ok=True)
    CXPX = CX_CM * PX_PER_CM
    sy, pre, canvas_h = A["sy"], A["art_prefix"], A["canvas_h"]
    D = A["details"]

    def mirror_sil(sil):
        return [{"y": p["y"], "left": round(2*CXPX - p["right"], 1),
                 "right": round(2*CXPX - p["left"], 1)} for p in sil]

    def sample(src, y0, y1, n=13):
        return [{"y": Y(y0 + i*(y1-y0)/n),
                 "left": X(edges(A, src, y0 + i*(y1-y0)/n)[0]),
                 "right": X(edges(A, src, y0 + i*(y1-y0)/n)[1])} for i in range(n+1)]

    # ---- assembled picker figure, front and back ----
    # D["torso"][:-1] drops the torso's inguinal crease: on the assembled figure the
    # thighs are drawn over the hips and their top edge already is that crease.
    front = render(A, FIGURE_STACK, D["torso"][:-1] + D["arm"] + D["leg"] + D["head"],
                   [0, 0, W, canvas_h], f"Human figure, front view", nipples=True)
    back = render(A, FIGURE_STACK, D["back"] + D["arm"] + D["leg"],
                  [0, 0, W, canvas_h], f"Human figure, back view")
    (out_dir / "front.svg").write_text(front)
    (out_dir / "back.svg").write_text(back)

    # ---- individual parts, drawn on their own ----
    parts, files = [], []
    for d in PARTS_DEF:
        y0, y1 = d["y"][0] * sy, d["y"][1] * sy
        src, (sy0, sy1) = d["surf"][0], (d["surf"][1][0] * sy, d["surf"][1][1] * sy)
        variants = [("-r", "r"), ("-l", "l")] if d["sided"] else [("", None)]
        for suffix, side in variants:
            pid = d["id"] + suffix
            vb = bounds(A, d["shapes"], side, y0, y1)
            svg = render(A, d["shapes"], D[d["details"]], vb, d["label"],
                         nipples=d.get("nipples", False), only_side=side)
            (out_dir / f"{pid}.svg").write_text(svg)
            files.append(pid)

            sil = sample(src, sy0, sy1)
            if side and MIRROR[side]:
                sil = mirror_sil(sil)
            parts.append({
                "id": pid,
                "label": (f"{'Right' if side=='r' else 'Left'} {d['label'].lower()}"
                          if d["sided"] else d["label"]),
                "art": f"{pre}{pid}.svg",
                "view": d["view"],
                "lengthCm": round(y1 - y0, 1),
                "viewBox": [round(v, 1) for v in vb],
                "rotation": ({"model": "cylinder", "degrees": 360}
                             if d["rot"] == "cylinder"
                             else {"model": "views", "views": ["front", "back"]}),
                "surface": {"model": "cylinder", "silhouette": sil},
            })

    # ---- regions + chains (sizing landmarks; a tattoo may span within a chain) ----
    regions, chains = [], {}
    for r in REGIONS:
        y0, y1 = r["y"][0] * sy, r["y"][1] * sy
        label, cm = r["ref"][0], r["ref"][1] * sy
        assert abs((y1 - y0) - cm) < 0.01, f"{r['id']}: {y1-y0}cm vs {cm}cm reference"
        sil = sample(r["src"], y0, y1, 10)
        vs = [("-r", mirror_sil(sil)), ("-l", sil)] if r["sided"] else [("", sil)]
        for suffix, sl in vs:
            rid, chain = r["id"] + suffix, r["chain"] + suffix
            regions.append({
                "id": rid, "label": r["label"], "chain": chain,
                "pxPerCm": PX_PER_CM,
                "referenceDimension": {"label": label, "cm": round(cm, 1),
                                       "px": Y(y1 - y0)},
                "surface": {"model": "cylinder", "wrapDegrees": r["wrap"],
                            "silhouette": sl},
            })
            chains.setdefault(chain, []).append(rid)

    chain_out = {}
    for cid, ids in chains.items():
        members = sorted((x for x in regions if x["id"] in ids),
                         key=lambda m: m["surface"]["silhouette"][0]["y"])
        merged, seen = [], set()
        for m in members:
            for p in m["surface"]["silhouette"]:
                if p["y"] not in seen:
                    seen.add(p["y"]); merged.append(p)
        merged.sort(key=lambda p: p["y"])
        chain_out[cid] = {"id": cid, "regions": ids,
                          "surface": {"model": "cylinder", "silhouette": merged}}

    (out_dir / "regions.json").write_text(json.dumps(
        {"figure": {"body": A["key"], "art": f"{pre}front.svg",
                    "artBack": f"{pre}back.svg", "heightCm": A["height_cm"],
                    "canvas": {"width": W, "height": canvas_h}, "pxPerCm": PX_PER_CM},
         "parts": parts, "chains": chain_out, "regions": regions}, indent=2) + "\n")

    print(f"[{A['key']}] front.svg + back.svg   {W}x{canvas_h}   "
          f"{PX_PER_CM} px/cm   {A['height_cm']} cm figure")
    print("  parts drawn on their own:")
    for p in parts:
        print(f"    {p['id']:8} {p['label']:18} {p['lengthCm']:>6} cm  "
              f"{p['rotation']['model']}")
    print("  regions (scale assertions):")
    for r in regions:
        rd = r["referenceDimension"]
        print(f"    {r['id']:14} {rd['label']:24} {rd['cm']:>5} cm  OK")

def build():
    for v in VARIANTS:
        build_variant(v())

if __name__ == "__main__":
    build()
