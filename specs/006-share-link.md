# 006 — Share link

**Status:** draft
**Roadmap item:** Now / Prototype v1

## What it does

"Send to my artist" turns the finished placement into a URL. The artist opens it and
sees the composite image, the body part, and the real-world size. No account on
either side.

## Why it matters

It's the handoff — the moment the app stops being a toy and starts saving the artist
time. It's also our distribution: every artist who receives a link meets the product
through a customer who already wanted to use it.

## How it works

On share, persist each card's placement — its body part id(s) (a card may hold more
than one part merged into one view, per D10), tattoo image, transform, size, unit —
and a pre-rendered composite PNG per card. Return a short URL.

The share page is read-only and legible in ten seconds:

- The composite image, large
- Body part, real-world size, and the flat/contoured state
- A quiet line noting the illustration shows average proportions, so the size is the
  customer's intent rather than a measurement of their body
- Download the image
- "Make your own" for the artist who wants to send it to their next customer

Give it proper Open Graph tags. These links get pasted into Instagram DMs and iMessage
and the preview image is doing real work.

Links don't expire in v1. Anyone with the URL can view — it's an unguessable id, not
a permission system, and nothing here is sensitive.

## Done when

- [ ] Share produces a working short URL
- [ ] Share page renders correctly on desktop and phone
- [ ] Composite image downloads
- [ ] Size and body part shown alongside the image
- [ ] Link preview works when pasted into Instagram DM and iMessage
- [ ] Works on a phone browser
- [ ] Needs no account

## Explicitly not in this

Artist accounts, submission inboxes, notifications, replies, quotes, expiry, or
deletion flows. Everything in that direction is a Later item.

## Open questions

- Where does the composite get stored, and what does it cost at any real volume?
- Does the customer want a copy of the link for themselves, or is sending it enough?
