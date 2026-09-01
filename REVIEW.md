# REVIEW

Running log. Newest at the top. One entry per session where something shipped,
something broke, or something was learned. Keep entries short and specific — this
file is for reconstructing *why*, not for celebrating.

Entry format:

```
## YYYY-MM-DD — short title

**Shipped:** what actually works now
**Learned:** what we found out (from a user, from the code, from being wrong)
**Changed:** what this means for the roadmap
**Open:** what's still unresolved
```

---

## 2026-09-01 — Landing screen fit, and the whole app on an 8pt grid

**Shipped:** `specs/008`. Two changes.

The landing screen no longer mis-renders on first load. `--app-height` is now set by
an inline script in `<head>` instead of a `useEffect`, so the first painted frame is
already the right height — before, the page painted at `100dvh` and then snapped once
React hydrated, which on a GitHub Pages load is slow enough to see. It also reads
`visualViewport.height` in preference to `innerHeight`, which is the only number that
matches what's visible inside an in-app WebView or under iOS Safari's collapsing
toolbar. The hero is now full-bleed to the top (the safe-area inset moved onto the
language pill, killing the black strip above the artwork), it has a top scrim and a
bottom fade instead of a hard seam, and the copy block has a `min-height` so a short
viewport crops the image rather than pushing the Select image button off-screen.

Every hand-written spacing and sizing value in `web/src` was then snapped to an 8pt
grid, declared as `--s-*` / `--r-*` tokens in `globals.css`. Type sizes stay off the
grid — type isn't spatial — but their line-heights are multiples of 4.

**Learned:** `window.innerHeight` was the wrong half of the earlier in-app-browser fix.
It reports the *large* viewport on iOS Safari, so content could still sit under the
toolbar; `visualViewport.height` reports what's actually visible. Also: anything that
sets a layout-critical CSS variable belongs in a pre-paint inline script, not an effect
— on a static export served from a CDN, the hydration gap is visible.

**Open:** The hero art is 474×639, so `object-cover` clips a badge at the edges on a
tall phone. A wider source image, or one with more margin around the composition, would
crop cleanly at every phone aspect ratio.

## 2026-08-31 — Fixed jagged contour warp on real-traced parts

**Shipped:** Contour warp on the real-traced body parts (torso especially, but arm,
back, and legs too) no longer renders a jagged zigzag edge. Reported via a screenshot
of a tattoo on the front torso whose warped edge looked like a mangled second body
outline instead of a smooth wrap.

**Learned:** Not a warp-algorithm bug — a data bug. `trace_geometry.py`'s `envelope()`
takes min/max-x per height bucket from the raw ink point cloud in the traced SVGs. At
a handful of rows the outline stroke has a gap, so min/max locks onto an interior mark
(a nipple, an ab line) instead of the true edge, producing a single-row inward dent in
the silhouette. `warp.ts` resolves the wrap radius per row (by design, so art can cross
a joint), so one bad row swings the radius wildly and shows up as a visible jag. A
plain 3-point median filter wasn't enough — two bad rows two apart sandwich a good row
that then looks like the outlier. A 5-point median (needs only 3 of 5 rows right)
fixed it cleanly; verified by re-deriving `assets/figure/real/manifest.json` and
diffing before/after silhouette points for max row-to-row jump.

**Changed:** `assets/tools/trace_geometry.py`'s `envelope()` now median-filters the
silhouette before returning it. Regenerated `assets/figure/combined.json` and synced
`web/public/figure/parts.json` + `web/public/figure/real/*.svg` per the rebuild steps
in `assets/README.md`.

**Open:** The very first row of `leg-shape-r` still has a real (harmless) 81px jump —
a single-point sliver at the hip crop where `warp.ts` already skips it (`R <= 1`). Not
worth special-casing. If more real-art parts get traced later, this smoothing pass
should catch the same class of gap automatically.

---

## 2026-08-29 — Mobile-first: bottom sheet, per-part cards, pinch-zoom

**Shipped:** Rebuilt the interaction model around mobile gestures.

- **Add body part → bottom sheet.** After upload, an "Add a body part" button appears;
  tapping it slides up a sheet (drag handle, backdrop dismiss, drag-down-to-dismiss)
  with the tappable figure and a checklist. Selections apply live; "Done" closes it.
- **Each part is its own card**, not a merged view. Selecting several parts in the
  sheet adds several independent cards to the page, each with its own drawing,
  position, and size — not a shared canvas. This retired the spanning-chain mechanism
  from two days ago (see D9 in `context/decisions.md`): now that a "part" is already a
  whole limb, the case spanning existed for (crossing the elbow) lives inside one
  part's own drawing, and cross-part spanning was always the weaker procedural
  fallback anyway since real art only ever covers one part.
- **Two-finger pinch to zoom/pan the view**, separate from the tattoo's own size. One
  finger moves the tattoo, two fingers navigate the view — the same split most drawing
  apps use, chosen so the two gestures never compete for the same touch.

**Learned:**

- **A transformed element's `getBoundingClientRect()` already accounts for CSS zoom,
  for free.** The drag-to-move and corner-resize math both read the stage's live
  bounding rect, so applying pinch-zoom as a CSS transform on that same element made
  every downstream calculation correct at any zoom level with no special-casing — and
  as a bonus, a given finger movement naturally produces a smaller placement-space
  delta when zoomed in, which is exactly the finer control zooming is supposed to buy.
- **Synthetic `PointerEvent`s can't hold `setPointerCapture`,** and firing a whole
  down/move/up gesture in one synchronous tick doesn't reliably reach a two-pointer
  state either — real touches always have natural micro-delays the synthetic dispatch
  didn't. Not a product bug, but it did surface a real one: `setPointerCapture` was
  being called *before* the pointer got recorded in the tracking map, so if capture
  ever throws, gesture tracking breaks silently with no error surfaced to the user.
  Reordered so state tracking never depends on capture succeeding, and wrapped the
  capture call itself so a throw can't take down the handler.
- **Verify gestures with a delayed, realistic event sequence, not an instant one.**
  The first pinch test produced no zoom at all and looked like a dead feature; adding
  ~100ms between down/move events (closer to how two real fingers actually land)
  showed it working correctly up to the 4x clamp. Concluding "broken" from the fast
  version would have been the wrong lesson.

**Changed:** `PlaceCanvas` now takes one `part`, not a list + union geometry —
`unionViewBox`/multi-part `surfaceAt` calls are gone from it, though the functions stay
in `geometry.ts` since `surfaceAt` is still used per-card. `PartsPicker` moved from an
inline disabled card into `BottomSheet` content. New `UploadCard` (trimmed, no
"Continue" button — everything is always live now, nothing gated behind steps).

**Open:**
- Drag-down-to-dismiss on the sheet is implemented but only tested via synthetic
  events, same caveat as the pinch gesture above.
- Cross-part spanning (shoulder onto arm) has no path back if someone asks for it —
  noted as the reversal condition on D9, not rebuilt speculatively.
- Head and hips still need re-traced source files; `04_right_arm.svg` still missing.
- No share link. No real-phone test. No artist has seen any of this.

## 2026-08-29 — Real reference artwork, single-page flow, Figma-style resize

**Shipped:** Three changes in one pass.

1. **The user's actual traced artwork is now in the app.** `assets/SVG body parts/`
   held real vector traces of the reference illustration. `trace_geometry.py` reads the
   point cloud directly for silhouette geometry (no more authored guesses), and a
   single part selected alone now shows that real drawing rather than a crop of the
   assembled procedural body. Torso, back, both arms, both legs confirmed working.
2. **One page, progressive disclosure.** Upload, part picker, and placement are one
   scrolling page instead of three step screens. The picker is visible but disabled
   until an image is uploaded; the placement section only mounts once a part is
   selected, and shows only the selected part(s) — never the whole body by default.
3. **Figma-style resize.** The slider is gone. Four corner handles on the tattoo's
   bounding box; dragging one scales uniformly from the opposite (anchored) corner,
   aspect ratio always locked.

**Learned:**

- **Two of the seven supplied files were broken traces, not just "different style."**
  `01_head.svg` and `06_hips.svg` came back as solid black fills rather than outlines
  — measurably: fill ratio (actual ink area over the path's own bbox) is 1-9% for the
  five good files and 64-70% for these two. That's a different trace *setting*, not a
  drawing quality issue, and it's exactly the kind of thing that's invisible until you
  measure it — a screenshot alone made all seven look plausibly similar at a glance.
  `04_right_arm.svg` was simply absent from the folder. Flagged all three concretely
  rather than guessing past them; mirrored the left arm as a temporary stand-in for
  the missing file and kept the procedural head/hips as a fallback for the broken ones.
- **A real single-part drawing and the procedural assembled figure don't share a
  coordinate space, and don't need to.** Each part now carries its procedural geometry
  (always, for the multi-select/spanning case) and, where we have one, a real overlay
  used only when it's the sole selection. `edgesAt`/`surfaceAt`/`unionViewBox` already
  operated on a minimal `{viewBox, surface}` shape, so a real part's local silhouette
  could stand in for a full `Part` without forcing it into the shared 900x1980 canvas.
- **A mirrored silhouette needs a mirrored drawing, not just mirrored math.** `arm-r`
  reuses the left-arm file with its silhouette numbers flipped for correct sizing/warp
  — but the *visual* SVG also has to flip (`transform: scaleX(-1)`, matched exactly to
  how the silhouette was mirrored) or the picture shows a left arm labeled "Right arm."
  Caught before wiring it in, not after.
- **Figma-style resize is a known algorithm, not a new invention:** anchor = opposite
  corner, scale factor = distance(pointer, anchor) / distance(startCorner, anchor),
  apply uniformly to width and center. Worth naming because it's the boring, correct
  answer — no reason to improvise something rougher.

**Changed:** `geometry.ts` gained a `Surfaceable` type generalizing away from `Part`.
`FigureSvg` takes a `mirror` prop. Three step-screen components deleted in favor of
`UploadCard` + `PartsPicker` + `PlaceCanvas`, composed on one page. Specs 001 and 003
updated.

**Open:**
- Head and hips need re-traced source files (outline mode, not solid fill) before
  they get real artwork too.
- `04_right_arm.svg` should be a real trace, not a mirrored stand-in, once available.
- Still no share link — nothing reaches an artist yet.
- Rotation still isn't wired into the app.
- Never tested on a real phone.

## 2026-08-28 — Redrew the body properly, as individual parts

**Shipped:** The figure rewritten around **parts drawn on their own** — head, neck &
torso, back, hips, left/right arm, left/right leg — matching the supplied mockup, plus
the assembled picker figure, all from one anatomy table. Real anatomy this time:
deltoid, elbow, forearm swell, a hand with fingers and thumb, knee, calf, a foot with
toes, pecs, abs, obliques, a genuine shoulder-to-waist V-taper. The app now shows the
isolated part when one is selected and the assembled body when several are.

**Learned:**

- **I had been told twice and kept shipping the same drawing.** I flagged the linework
  as "serviceable, not beautiful" in two consecutive reviews and moved on both times
  rather than fixing it. A known weakness that keeps getting logged instead of fixed is
  just a decision to ship it. The reference was clear from the first time it was sent.
- **Isolated parts were the actual ask, and I read it as a style note.** The mockup is a
  sheet of separate limbs; the app was showing crops of an assembly, so picking "arm"
  gave you an arm with a sliver of torso in frame. Rendering each part alone was
  structural, not cosmetic — and cheap, because every part already lived in the same
  coordinate space as the assembly.
- **Left and right were inverted.** `arm-r` was drawn on the viewer's right, which is a
  person's *left* arm. It renders identically in a picker and is completely wrong on the
  brief — the artist tattoos the wrong arm. Anatomical side is now decided in exactly
  one place (`MIRROR`), because it is invisible in every screenshot.
- **Never run `next build` against a live `next dev`.** It overwrites `.next/` and the
  dev server then serves 404s for its own chunks, which presents as an unstyled page
  stuck on "Loading…" with no error in the console. Stop the dev server first.

**Changed:** `build_figure.py` rewritten around parts + a limb-profile helper with
rounded caps (a flat-topped shoulder reads as amputation when a part stands alone).
`FigureSvg` takes any art file; `PlaceStep` picks isolated vs assembled.

**Open:**
- Rotation still isn't wired in — half the body remains unreachable.
- No share link, so nothing yet reaches an artist.
- Still never tested on a real phone.
- The drawing is now decent but not equal to the reference: hands and feet are
  simplified, and the torso's shoulder caps are squarer than they should be.

## 2026-08-28 — Version 1 runs end to end

**Shipped:** The application, in `web/`. Next.js + TypeScript + Tailwind, phone-first,
styled to the reference: violet primary, white rounded cards, heavy tight headlines.
The whole loop works — upload a design, pick one or several body parts, drag it into
place, resize by real centimetres or inches, see it contoured to the skin. Production
build passes.

**Learned:**

- **The size readout was wrong, in exactly the way `specs/004` predicted and I still
  didn't implement.** It measured the uploaded PNG's bounding box, transparent padding
  included. The test artwork filled 56% of its file, so a tattoo reported as 5.3 cm was
  drawing at 3.0 cm — and the aspect ratio was wrong too (5.3 × 6.5 rather than
  5.3 × 10.5). Most tattoo PNGs arrive with generous margins, so this would have been
  wrong for nearly every real upload. Caught by measuring the rendered ink in the
  canvas rather than trusting the screenshot; the fix trims to the ink at load, so
  everything downstream is in terms of the artwork. Writing the warning in the spec was
  evidently not enough to stop me shipping the bug.
- **An SVG and a canvas overlay must not each pick their own scale.** With
  `preserveAspectRatio`, the SVG letterboxed itself to 0.54 while the canvas assumed
  1.14, so the tattoo rendered far off-screen. Fix: compute the stage box from the
  viewBox aspect in JS and let both share one scale. CSS `aspect-ratio` plus
  `max-height` does not do this — it keeps the width and violates the ratio.
- **A default size has to come from the body, not a constant.** 8 cm on an 8.4 cm arm
  wraps most of the way round; the warp was correct and it still looked broken. Default
  is now 62% of the local limb width.
- **Verify canvas work by measuring pixels.** Three visual judgements about the warp
  were wrong; one `getImageData` bounding-box check settled it in seconds.

**Changed:** Specs 001, 002, 004, 005 marked shipped; 003 building. Roadmap's Now list
is down to rotation and the share link. `CLAUDE.md` records the real stack and the
decision to use system fonts rather than a webfont.

**Open:**
- **Rotation is proven but not wired in.** `specs/007` maths is verified in the proof
  page; the app has no rotation control yet. Placement is front-view only, which means
  half the body is still unreachable.
- **No share link.** `specs/006` is the last piece of the loop, and without it nothing
  reaches an artist — which is the entire promise.
- Tattoo rotation and flip aren't implemented (spec 003's remaining items), nor undo.
- Untested on a real phone. Everything so far is an emulated 375×812 viewport, and
  spec 003's whole point is how it *feels* under a thumb.
- Still: no artist has seen any of this.

## 2026-08-28 — Back view, and a git history to keep it in

**Shipped:** `assets/figure/back.svg`, generated from the same profile as the front.
Repo is now under git; everything built across the two prior sessions is committed as
a clean baseline before this change.

**Learned:**

- **The back view was cheaper than the front one was.** Body width doesn't change
  front-to-back, so every silhouette, region, chain and part in `regions.json` is
  already correct for the back — only the interior surface drawing had to be authored.
  `build_figure.py` now takes a `detail_pts` table per view and shares everything else.
- **First pass at the back anatomy was wrong in an instructive way.** Three broad arcs
  (shoulder blade, lat, glute) each spanning most of the torso width rendered as one
  merged dome instead of three distinct features — the same lesson as the very first
  forearm attempt days ago: anatomy lines need to hug their own region tightly, or
  Catmull-Rom smoothing through widely spaced points reads as a blob. Fixed by cutting
  each curve's span roughly in half.
- **Nothing about scale, regions, or the warp needed to change.** The whole point of
  driving both views off one profile is that adding a view is additive.

**Changed:** `regions.json` now carries `artBack`. `specs/001`'s back-view open item is
closed. Roadmap's "before v1" punch list (git, back view) is now down to app scaffolding.

**Open:**
- No actual application exists yet — everything to date is the asset pipeline and
  static proof pages. That's the next real piece of work, not a remaining design
  question.
- Still unresolved: visible tap affordance for regions, elliptical limb cross-sections,
  image storage for the share link, and no artist has seen any of this yet.

## 2026-08-28 — Parts, and 360° rotation

**Shipped:** Parts matching the mockup — head, neck & torso, hips, left/right arm,
left/right leg — emitted alongside the assembled figure from the same profile. A
rotation model per part, and a proof that a limb rotates through 360° from one drawing
with the tattoo staying fixed to the same patch of skin. `specs/007-rotate-part.md`.

**Learned:**

- **Rotating a limb needs no extra drawings.** A limb is a stack of near-circular
  cross-sections, so its outline is identical from every angle — rotating changes which
  skin faces the viewer, not the silhouette. 360° is therefore one extra term in the
  projection, `alpha - theta`, not eight illustrations per limb. This was the thing most
  likely to be expensive and it turned out nearly free.
- **The torso is a different problem, and the mockup already knew that.** Its
  cross-section is nowhere near circular and front and back are genuinely different
  pictures — which is exactly why the mockup lists "neck & torso" and "back" separately
  rather than expecting one rotating torso. Head, torso and hips get discrete views.
- **Anatomy lines carry the entire perception of rotation.** With a fixed outline, a
  rotating limb looks static unless surface detail moves. Putting the biceps, elbow
  crease and ulna ridge on the surface at their own angles is what makes it read as
  turning rather than as a bug.
- **"Individual SVGs or one figure" was a false choice.** The source of truth is the
  measurements; a part and a whole figure are two projections of the same numbers.
  Generating both costs nothing and they can't drift.

**Changed:** D7 and D8 added. `specs/001` reframed around parts with regions underneath;
`specs/007` created. Roadmap gains a rotation item.

**Open:**
- **The back view is the one genuinely new drawing the mockup needs.** Everything else
  is already generated. It's a new profile, not a new system.
- Forearms and calves are noticeably elliptical, not round. The circular approximation
  is at its worst at 90°, where an ellipse is narrowest. Fix is one number per part —
  but check whether it's visible before adding it.
- Rotation has to appear in the brief. "Outer forearm, rotated 90°" is exactly the
  ambiguity the product exists to remove, so it can't live only in the picture.
- Still unresolved from yesterday: the linework is serviceable, not beautiful, and no
  artist has seen any of this.

## 2026-08-28 — Multi-select, and spanning a joint

**Shipped:** Regions are now multi-select. Ten regions (left/right arms and legs, chest,
stomach) and five *chains* — runs of regions sharing a continuous surface, which a
tattoo may span. The contour warp resolves radius per row, so a piece crossing the elbow
pinches where the arm narrows. `contour-proof.html` rebuilt as static SVG.

**Learned:**

- **Spanning settles the architecture question, from an angle D5 didn't anticipate.**
  Asked whether individual per-limb SVGs were needed, the answer turns out to be
  stronger than "no": per-limb files would *break* spanning. A tattoo crossing the elbow
  would have to be split across two coordinate systems and stitched, fighting alignment
  and a seam at every joint, forever. One figure makes it nearly free.
- **A single radius per tattoo is wrong as soon as anything spans.** It looks fine on a
  small piece, which is how it would ship unnoticed, and visibly wrong on a sleeve —
  the limb's width changes underneath the artwork. Radius has to be resolved per row.
- **The preview harness doesn't run page scripts.** Two rounds were spent looking at a
  blank canvas before checking. Computing the warp at build time and emitting static
  SVG is better anyway: the proof now renders anywhere, needs no JS, and warping vector
  geometry makes the distortion exact rather than sampled.

**Changed:** D6 added. `specs/001` covers multi-select and chains, `specs/003` states a
span is one canvas, `specs/005` carries the per-row algorithm. Roadmap item 1 now reads
ten regions with multi-select.

**Open:**
- Cross-chain spans (shoulder into arm) have no junction model. Selection is allowed;
  contouring is per-surface. Moved to Next rather than faked.
- Multi-select needs an interaction that reads on a phone. Tap-to-toggle is obvious;
  whether anyone *discovers* spanning is possible is not.
- The linework is still serviceable rather than beautiful. Unchanged from yesterday,
  and still the thing most worth an artist's opinion.

## 2026-08-27 — Neutral outline figure, replacing the shaded limbs

**Shipped:** `assets/tools/build_figure.py` and the figure it generates — one neutral
front-view line drawing, 180 cm at 10 px/cm, with six named regions (forearm, upper
arm, thigh, calf, chest, stomach). `contour-proof.html` rebuilt against it. The shaded
per-limb assets from this morning are deleted.

**Learned:**

- **Neutral outline removes two problems at once.** No skin tone means no "which body
  is the default" decision and nothing for a customer to feel excluded by. It's also
  the register artists already read — flash sheets and placement charts look like this,
  so it lands as a professional tool rather than a toy.
- **Regions beat separate assets.** "Left inner forearm" is a place on a body, not a
  standalone object. Vector art makes a region view a zoomed viewBox into the same
  file, so there's one drawing to maintain instead of seven and zooming is free.
- **The contour warp survived the style change unaltered.** Worth noting because it
  was the risky item: the warp was always geometric, never dependent on shading. It
  reads on plain outline with nothing but compression selling the curve. Only change
  was raising the opacity floor to ~0.45 — on white, ink that fades too far at the
  edges looks like a bug rather than a surface turning away.
- Two things in the drawing are load-bearing and were not obvious: the shorts exist to
  hide the torso/leg junction, and the arms must be drawn *in front* of the torso so
  their inner edge reads as the deltoid line instead of the arm floating beside the body.

**Changed:** `specs/001` is now a region picker rather than a grid of body parts. D5
added to `context/decisions.md`. Skin tone options dropped from the roadmap entirely —
the neutral figure makes them moot.

**Open:**
- **The linework is serviceable, not beautiful.** Proportion and geometry are right,
  but it's a weaker drawing than the reference it came from, and hand-tuning
  coordinates converges slowly. Options: keep iterating, commission linework, or
  vectorise a reference image and fit the region geometry to it. The third is cheapest
  and needs `potrace` (not installed) plus a clear answer on where the source art came
  from — tracing someone else's illustration into a commercial product is a licensing
  problem, tracing your own or a generated one isn't.
- Regions give no affordance on an outline drawing. Needs a visible hit state.
- `wrapDegrees` for chest and stomach (105–110) is a guess. Untested against a real
  placement.
- One figure means one set of proportions. Whether that's enough for an artist to quote
  from is a question for the first artist conversation.

## 2026-08-27 — Body part assets are generated, not commissioned

**Shipped:** An asset pipeline (`assets/tools/build_body_part.py`) and the first three
body parts — forearm, upper arm, calf — as hand-authored SVG. Plus
`assets/contour-proof.html`, a working demonstration of the contour warp.

**Learned:** Two things, and the second is the useful one.

1. The illustrations don't need commissioning or licensing. They're authored as SVG
   from a table of ~12 `(y, left, right)` rows at a fixed 30 px/cm. One profile emits
   both the artwork and `meta.json`, so scale and geometry can't drift apart, and the
   build asserts px/cm on every run.

2. **The displacement map doesn't need painting either.** A limb is close enough to a
   cylinder that the silhouette *is* the surface model — half-width at a height is the
   radius, and the normal follows from horizontal position within it. Foreshortening
   and the edge fade both fall out of `s = R·asin((x−cx)/R)`. This was the real cost
   worry: a hand-painted map per asset would have made a seven-part library expensive
   and a twenty-part library untenable. It's now zero marginal cost per asset.

**Changed:** `specs/001` and `specs/005` rewritten. `displacement.png` is gone from the
asset format. The blocking open question from the setup entry below is closed. Adding
the remaining four body parts is now editing a table rather than a procurement
decision.

**Open:**
- The three assets are anatomically plausible but generic — they read as "a limb"
  rather than a specific person's forearm. Unknown whether that's good enough for an
  artist to quote from. This is a question for the first artist conversation, not
  something to solve by drawing harder.
- Back and chest aren't cylinders. They need a different surface model, or none.
- The warp uses the radius at the tattoo's centre and ignores taper across its height.

## 2026-08-27 — Workspace set up

**Shipped:** The workspace scaffold — `CLAUDE.md`, `ROADMAP.md`, this file, and the
`context/`, `customers/`, `specs/`, `demos/`, `routines/` folders. No product code yet.

**Learned:** Four decisions locked in up front (see `context/decisions.md`):
responsive web app rather than native; illustrated body parts rather than user photos;
shareable link as the handoff; no accounts in v1. The illustration choice is the
important one — because we draw the body parts ourselves, we know their real
dimensions and their surface geometry, which is what makes both accurate sizing and
believable contouring achievable in a prototype.

**Changed:** Roadmap v1 is six items ending in a shareable link. Everything about
artist accounts moved to Later.

**Open:** Where the body-part illustrations come from (commission, stock, or generate)
and how many we need before the picker feels real. Blocking `specs/001`.
