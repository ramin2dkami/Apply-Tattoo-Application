# ROADMAP

**Goal right now:** a working prototype that a stranger can open on their phone, use
without instructions, and send to their tattoo artist.

Status key: `[ ]` not started · `[~]` in progress · `[x]` done

---

## Now — Prototype v1

The whole loop, roughly done, end to end. Nothing here is optional; together they are
the product.

- [x] **Body part picker.** Tap a part on the figure: head, neck & torso, back, hips,
      left/right arm, left/right leg. Multi-select, so a piece can span a joint.
      Spec: `specs/001-body-part-picker.md`
- [ ] **Rotate the part.** Maths proven, not yet wired into the app. Drag to spin a limb through 360&deg; and place the tattoo on
      any side. Head, torso and hips step between front and back views.
      Spec: `specs/007-rotate-part.md`
- [x] **Tattoo upload.** Drag/drop or file picker. PNG with transparency is the happy
      path; JPG gets a background-removal nudge, not a blocker.
      Spec: `specs/002-tattoo-upload.md`
- [~] **Place, size, rotate.** Mobile-first now: bottom sheet to add parts, same-view
      parts merge into one card (D10) so several parts share one placement, Figma-style
      corner handles, two-finger pinch to zoom/pan the view independent of the tattoo's
      own size. Drag to move, pinch/handles to resize, rotate, adjust opacity. Must
      feel good on a touchscreen — this is the whole app.
      Spec: `specs/003-place-size-rotate.md`
- [x] **Real-world size readout.** Live "4.5 in × 3.1 in" derived from the body
      part's reference dimension. Toggle cm/inches.
      Spec: `specs/004-real-world-sizing.md`
- [x] **Contour to the body.** Warp the tattoo to the body part's surface using a
      per-asset displacement map, so it reads as skin, not a sticker.
      Spec: `specs/005-contour-warp.md`. Radius resolved per row; ships with a
      flat/contoured toggle.
- [ ] **Shareable link.** "Send to my artist" produces a URL showing the composite
      image, the body part, the placement, and the size. No login for either side.
      Spec: `specs/006-share-link.md`

## Next — after real people have used it

Ordered by how often we expect to hear about them. Do not start these until v1 is in
front of at least three artists.

- [ ] Side views for torso and hips
- [ ] Elliptical cross-sections for forearm and calf
- [ ] Notes field on the share page ("I want it here, this size, black and grey")
- [ ] Multiple separate tattoos placed in one session
- [ ] Spanning across chains with real-art fidelity preserved (D10 already merges
      same-view parts into one procedural card; the remaining gap is a junction model
      accurate enough to keep real traced art when a design crosses, say, shoulder
      into arm, instead of falling back to line art)
- [ ] Artist-branded intake link (their name on the page)
- [ ] Copy-to-clipboard / native share sheet on mobile

## Later — the actual business

Only once artists are asking for it by name.

- [ ] Artist accounts and a submission inbox
- [ ] Quote workflow (artist replies with a price on the same link)
- [ ] Photo mode: place on the customer's own photo, not an illustration
- [ ] Native app wrapper / AR preview
- [ ] Payments, deposits, booking

## Explicit non-goals for now

Naming these keeps them from creeping in:

- No user accounts, no login, no password reset
- No database of past designs
- No AI generation of tattoo art
- No artist marketplace or discovery
- No payments
- No desktop-first design — phone is the primary device
