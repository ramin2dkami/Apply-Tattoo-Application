# Decisions

Append-only-ish. Newest at the bottom. Record the decision, the reasoning, and what
would make us reverse it. If a decision gets reversed, don't delete it — add a new
entry that supersedes it.

---

### D1 — Responsive web app, not native (2026-08-27)

**Decision:** Next.js web app, phone-first, works in a mobile browser.

**Why:** The product only works if a customer can open a link and use it immediately.
An app store install between "artist sends link" and "customer places tattoo" kills
the loop. Web also means one codebase and same-day iteration.

**Reverse if:** we need real AR or camera-depth features badly enough to justify the
install friction.

---

### D2 — Illustrated body parts, not customer photos (2026-08-27)

**Decision:** v1 places tattoos on a library of illustrations we control.

**Why:** Known geometry. Because we draw the asset, we know its real-world reference
dimensions (so "4.5 inches" is a true number) and its surface curvature (so the
tattoo can contour rather than sit flat). Customer photos give us none of that, plus
they add a photography step that many people will not complete.

**Reverse if:** artists consistently say the illustration isn't close enough to the
customer's actual body to quote from. Photo mode is already parked in Later.

---

### D3 — Shareable link as the handoff (2026-08-27)

**Decision:** Output is a URL, not an email, not a dashboard.

**Why:** It drops into the channel artists already use — Instagram DMs and text. The
artist has nothing to install and nothing to sign up for. It also gives us a natural
distribution loop: every artist who receives a link sees the product.

**Reverse if:** links get stripped or deranked in the DM channels artists actually
use, in which case a downloadable image becomes the primary output.

---

### D4 — No accounts in v1 (2026-08-27)

**Decision:** Anonymous on both sides. No login, no database of users.

**Why:** Every auth screen is a place to lose people, and we don't need identity to
deliver the core value. Accounts become interesting only when artists want a
submission inbox — which is a Later item.

**Reverse if:** artists start asking to see all their submissions in one place, which
would be a good problem.

---

### D5 — One neutral outline figure, not seven shaded limbs (2026-08-27)

**Decision:** A single front-view figure drawn as neutral line art — outlines only, no
fill colour, no skin tone — with placement areas defined as named *regions* of that one
drawing.

**Why:** Three separate wins from one choice.

- **Neutral sidesteps representation entirely.** No skin tone to pick, so no "which
  body is the default" problem, and nothing for a customer to feel excluded by.
- **It's the register artists already read.** Flash sheets and placement charts look
  exactly like this. A shaded cartoon limb reads as a toy; a line figure reads as a
  professional tool.
- **Regions beat separate assets.** "Left inner forearm" is a place on a body, not a
  standalone object. Because the art is vector, a region view is just a zoomed viewBox
  into the same file — one drawing to maintain instead of seven, and zooming is free.

Supersedes the shaded, per-limb assets built earlier the same day. The contour warp
survives the change unaltered: it was always geometric, never dependent on shading.

**Reverse if:** artists say the neutral figure is too abstract to place against, or
customers can't find themselves in it well enough to trust the result.

---

### D6 — Regions are multi-select, within chains (2026-08-28)

**Decision:** The customer may select several regions at once, and a tattoo may span
them. Regions sharing a continuous surface are grouped into a *chain*
(`upper-arm + forearm`, `thigh + calf`, `chest + abdomen`); selecting several within a
chain merges their silhouettes into one surface. Selection across chains is allowed but
each surface is contoured separately.

**Why:** Real work spans joints — sleeves cross the elbow, leg pieces cross the knee.
Forcing one region per tattoo would make the tool useless for exactly the large,
expensive pieces where an accurate quote matters most.

This also settles an architecture question. Per-limb SVG files would need a tattoo
crossing a joint to be split across two coordinate systems and stitched, fighting
alignment and a visible seam at every junction. One figure with regions as windows
makes spanning nearly free: the artwork stays in a single coordinate space and the
merged silhouette gives a cylinder whose radius varies down its length. Confirms D5
for a reason D5 didn't anticipate.

**Reverse if:** nothing plausible. Even if the figure were later replaced with better
artwork, the one-drawing-with-regions structure should survive.

---

### D7 — Parts are what the customer picks; limbs rotate freely (2026-08-28)

**Decision:** The customer picks a *part* — head, neck & torso, back, hips, left/right
arm, left/right leg — and can rotate it to place a tattoo anywhere around it. Arms and
legs rotate continuously through 360&deg; from a single drawing. Head, torso and hips
step between discrete front/back views instead.

**Why:** Placement is meaningless without rotation. Inner forearm and outer forearm are
different tattoos at different prices, and roughly half of all placements are somewhere
you cannot see in a front view.

The split between the two rotation models is forced by geometry, not preference. A limb
is a stack of near-circular cross-sections, so its outline looks the same from every
angle — rotating changes *which skin faces you*, not the silhouette. That makes 360&deg;
one extra term in the projection rather than a set of new illustrations. A torso is
nowhere near circular and its front and back are genuinely different pictures, which is
why the mockup shows "neck & torso" and "back" as separate items. Pretending a torso
rotates continuously would mean inventing side views that don't follow from the
geometry.

**Reverse if:** artists find the cylinder approximation too crude for forearms and
calves, which are noticeably elliptical rather than round. The fix is an elliptical
cross-section — one more number per part, not a new model.

---

### D8 — Parts and the whole figure come from the same profile (2026-08-28)

**Decision:** Body parts are emitted as individual assets *and* assembled into one
figure, both generated from the same profile table.

**Why:** The mockup wants isolated parts to place on; the picker wants a whole body to
tap. These are two renderings of one set of numbers, not two sets of artwork. Generating
both means they cannot drift, no part is drawn twice, and adding a part updates the
picker automatically.

This is also why the earlier "individual SVGs vs one figure" question had no real
tension in it: the source of truth is the measurements, and any view is a projection.

---

### D9 — One card per body part, no cross-part spanning (2026-08-29)

**Decision:** Each added body part gets its own independent placement card — its own
drawing, its own tattoo position, its own size. Selecting several parts in the picker
adds several cards, not one merged view. The earlier "spanning chain" mechanism (two
regions of one limb merged into a single warped surface, e.g. upper-arm + forearm
across the elbow) is retired.

**Why:** Real per-part artwork (D-whatever, the traced SVGs) only ever applies to one
part at a time — a merged view of two different parts never had real art to show
anyway, so it was always the weaker procedural fallback. Now that each part is a whole
limb already (not upper-arm/forearm as separate choices), the case spanning existed to
solve — a piece crossing the elbow — is already handled inside one part's own drawing.
What's left (a tattoo genuinely crossing from torso onto an arm) is rare, and one card
per part is a far simpler, more predictable mobile pattern: tap to add, see it appear,
tap to remove.

**Reverse if:** customers meaningfully ask to preview one continuous design across two
unrelated parts (shoulder blade onto the back of the arm, say). That would need a
resurrected shared-coordinate-space mode, kept as an option rather than the default.
