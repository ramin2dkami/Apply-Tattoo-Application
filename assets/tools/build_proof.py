#!/usr/bin/env python3
"""Rebuild assets/contour-proof.html. Run after build_figure.py.

Everything is computed here and emitted as static SVG — no JavaScript, so the page
renders anywhere. The app does the same maths per-pixel on a canvas.
"""
import json, math, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
FIG  = ROOT / 'assets/figure'
PPCM = 10

svg   = (FIG/'front.svg').read_text()
inner = svg.split('>', 1)[1].rsplit('</svg>', 1)[0]
data  = json.loads((FIG/'regions.json').read_text())
W, H  = data['figure']['canvas']['width'], data['figure']['canvas']['height']
part  = next(p for p in data['parts'] if p['id'] == 'arm-r')
SIL   = part['surface']['silhouette']

def edges(y):
    for a, b in zip(SIL, SIL[1:]):
        if y <= b['y']:
            t = 0 if b['y'] == a['y'] else (y - a['y']) / (b['y'] - a['y'])
            return (a['left'] + (b['left']-a['left'])*t,
                    a['right'] + (b['right']-a['right'])*t)
    return SIL[-1]['left'], SIL[-1]['right']

def axis(y_px):
    l, r = edges(y_px)
    return (l+r)/2, (r-l)/2                       # centre, radius

# ---------------------------------------------------------------- projection
# A point on a limb is (height, angle-around-the-axis). Rotating the limb by theta
# just shifts every angle. The OUTLINE never changes — a circular cross-section looks
# the same from every side — which is why one drawing covers all 360 degrees.
VIS = 0.09

def project(y_cm, alpha_deg, theta_deg):
    y = y_cm * PPCM
    cx, R = axis(y)
    a = math.radians(alpha_deg - theta_deg)
    return cx + R*math.sin(a), y, math.cos(a)

def strokes_to_svg(polys, theta, width, colour="#141414"):
    """Draw only the parts facing the viewer, fading as the surface turns away."""
    buckets = {}
    for poly in polys:
        pts = [project(y, a, theta) for y, a in poly]
        for p, q in zip(pts, pts[1:]):
            if p[2] <= VIS or q[2] <= VIS:
                continue
            k = round(min(p[2], q[2])*4)/4
            buckets.setdefault(max(0.25, k), []).append(
                f"M{p[0]:.1f} {p[1]:.1f}L{q[0]:.1f} {q[1]:.1f}")
    return (f'<g fill="none" stroke="{colour}" stroke-width="{width}" '
            f'stroke-linecap="round">'
            + "".join(f'<path d="{"".join(v)}" stroke-opacity="{k:.2f}"/>'
                      for k, v in sorted(buckets.items())) + '</g>')

def run(y0, y1, alpha0, alpha1=None, n=26):
    """A line across the surface: constant angle down the limb, or an arc across it."""
    a1 = alpha0 if alpha1 is None else alpha1
    return [(y0 + (y1-y0)*i/n, alpha0 + (a1-alpha0)*i/n) for i in range(n+1)]

# Anatomy as surface curves, each at its own angle around the arm. These are what
# actually sell the rotation: front detail slides away, back detail slides in.
DETAIL = [
    run(46, 67, -32),            # biceps
    run(47, 68, 168),            # triceps, on the back
    run(70, 70, -46, 46),        # elbow crease, an arc across the front
    run(67, 75, 180),            # point of the elbow
    run(74, 93, 24),             # flexor
    run(72, 94, -96),            # ulna ridge, on the outside
    run(68, 86, -54),            # brachioradialis
    run(88, 94, 10, -10),        # wrist
]

# ---------------------------------------------------------------- the artwork
W_CM, H_CM, CY_CM, ALPHA0 = 6.0, 7.5, 80.0, 0.0

def seg(p, q, n=12):
    return [(p[0]+(q[0]-p[0])*i/n, p[1]+(q[1]-p[1])*i/n) for i in range(n+1)]
def ring(cx, cy, r, n=44):
    return [(cx+r*math.cos(2*math.pi*i/n), cy+r*math.sin(2*math.pi*i/n))
            for i in range(n+1)]

hw, hh = W_CM/2, H_CM/2
art_heavy = [seg((-hw,-hh),(hw,-hh)) + seg((hw,-hh),(hw,hh))[1:]
             + seg((hw,hh),(-hw,hh))[1:] + seg((-hw,hh),(-hw,-hh))[1:],
             seg((0,-2.4),(2.4,0)) + seg((2.4,0),(0,2.4))[1:]
             + seg((0,2.4),(-2.4,0))[1:] + seg((-2.4,0),(0,-2.4))[1:],
             ring(0,0,1.25), ring(0,0,0.42)]
art_light = ([seg((-hw,-hh+2*hh*i/8),(hw,-hh+2*hh*i/8)) for i in range(1,8)]
             + [seg((-hw+2*hw*i/6,-hh),(-hw+2*hw*i/6,hh), n=18) for i in range(1,6)])

def art_to_surface(polys, theta):
    """Artwork sits ON the skin: its horizontal axis is arc length, so it wraps."""
    out = []
    for poly in polys:
        cur = []
        for u, v in poly:
            y = CY_CM + v
            cx, R = axis(y*PPCM)
            a = math.radians(ALPHA0 - theta) + (u*PPCM)/R
            c = math.cos(a)
            if c <= VIS:
                if len(cur) > 1: out.append(cur)
                cur = []; continue
            cur.append((cx + R*math.sin(a), y*PPCM, c))
        if len(cur) > 1: out.append(cur)
    return out

def art_svg(polys, theta, width):
    buckets = {}
    for poly in art_to_surface(polys, theta):
        for p, q in zip(poly, poly[1:]):
            k = max(0.3, round(min(p[2], q[2])*4)/4)
            buckets.setdefault(k, []).append(
                f"M{p[0]:.1f} {p[1]:.1f}L{q[0]:.1f} {q[1]:.1f}")
    return (f'<g fill="none" stroke="#141414" stroke-width="{width}" '
            f'stroke-linecap="round">'
            + "".join(f'<path d="{"".join(v)}" stroke-opacity="{k:.2f}"/>'
                      for k, v in sorted(buckets.items())) + '</g>')

# ---------------------------------------------------------------- page
vb = part['viewBox']
DW = 96; DH = DW * vb[3] / vb[2]
ANGLES = [0, 45, 90, 135, 180]

def panel(theta):
    body = strokes_to_svg([[(y, a) for y, a in d] for d in DETAIL], theta, 1.8,
                          "#5c5651")
    return f'''<figure>
  <svg viewBox="{vb[0]} {vb[1]} {vb[2]} {vb[3]}" width="{DW}" height="{DH:.0f}">
    <use href="#figure"/>{body}{art_svg(art_light, theta, 1.5)}{art_svg(art_heavy, theta, 3.6)}
  </svg>
  <figcaption>{theta}&deg;</figcaption></figure>'''

def poly_pts(sil):
    return " ".join(f"{p['left']},{p['y']}" for p in sil) + " " + \
           " ".join(f"{p['right']},{p['y']}" for p in reversed(sil))

pmap = {p['id']: p for p in data['parts']}
rows = "".join(
    f"<tr><td>{p['label']}</td><td>{p['lengthCm']:.0f} cm</td>"
    f"<td>{'360&deg; continuous' if p['rotation']['model']=='cylinder' else 'front / back views'}</td></tr>"
    for p in data['parts'])
hot = "".join(f'<polygon points="{poly_pts(p["surface"]["silhouette"])}"/>'
              for p in data['parts'] if p['id'] in ('arm-r','arm-l','leg-r','leg-l'))

html = f'''<!doctype html>
<meta charset="utf-8">
<title>Rotating a body part</title>
<style>
  body {{ margin:0; padding:34px; font:15px/1.55 -apple-system,system-ui,sans-serif;
         background:#fbfaf8; color:#1a1a1a; }}
  h1 {{ font-size:20px; margin:0 0 4px; font-weight:650; }}
  h2 {{ font-size:12px; letter-spacing:.08em; text-transform:uppercase;
        color:#77706a; margin:34px 0 12px; font-weight:600;
        border-top:1px solid #e8e2da; padding-top:14px; }}
  p.sub {{ margin:0 0 22px; color:#77706a; max-width:660px; }}
  .strip {{ display:flex; gap:10px; align-items:flex-start; flex-wrap:wrap; }}
  figure {{ margin:0; text-align:center; }}
  figure svg {{ border:1px solid #e8e2da; border-radius:9px; background:#fff;
                display:block; }}
  figcaption {{ font-size:12px; color:#77706a; margin-top:7px;
                font-variant-numeric:tabular-nums; }}
  table {{ border-collapse:collapse; font-size:13px; }}
  td {{ padding:5px 16px 5px 0; border-bottom:1px solid #eee7df; }}
  td:first-child {{ font-weight:600; }} td:nth-child(2) {{ color:#77706a; }}
  .hot polygon {{ fill:#2563eb; fill-opacity:.10; stroke:#2563eb;
                  stroke-opacity:.6; stroke-width:3; }}
  .row {{ display:flex; gap:44px; align-items:flex-start; flex-wrap:wrap; }}
</style>

<h1>Rotating a limb costs no extra drawings</h1>
<p class="sub">A limb is a stack of circular cross-sections, so its outline looks the
same from every angle — turning an arm changes <em>which skin faces you</em>, not the
silhouette. That makes 360&deg; rotation one extra term in the maths rather than a set
of new illustrations. Below: one drawing, one tattoo fixed to the same patch of skin,
five rotations. The anatomy lines are on the surface too, so front detail slides away
as back detail slides in.</p>

<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<g id="figure">{inner}</g></defs></svg>

<div class="strip">{"".join(panel(t) for t in ANGLES)}</div>

<h2>Which parts rotate freely, and which don't</h2>
<div class="row">
  <div>
    <p class="sub" style="max-width:420px">Arms and legs are near enough to cylinders
    to rotate continuously from one drawing. Head, torso and hips are not — their
    cross-section is nowhere near circular and the front and back are genuinely
    different pictures, which is exactly why your mockup has both. Those get discrete
    views instead of free rotation.</p>
    <table>{rows}</table>
  </div>
  <div>
    <div style="font-size:12px;color:#77706a;letter-spacing:.06em;
                text-transform:uppercase;margin-bottom:9px">Freely rotatable</div>
    <svg viewBox="0 0 {W} {H}" width="250" height="{250*H/W:.0f}">
      <use href="#figure"/><g class="hot">{hot}</g></svg>
  </div>
</div>
'''
(ROOT/'assets/contour-proof.html').write_text(html)
print('wrote assets/contour-proof.html', len(html))
