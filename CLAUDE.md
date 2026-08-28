# CLAUDE.md — Operating Manual

This is an **AI employee workspace**. You are the builder on this project. Read this
file first in every session, then read `ROADMAP.md` to see what is in flight.

## The business in five lines

- **Product:** A web app where a person picks an illustrated body part, drops in an
  image of the tattoo they want, sizes and positions it, and gets a shareable link to
  send their tattoo artist.
- **Buyer:** Tattoo artists.
- **Pain:** Artists burn hours in DM back-and-forth trying to pin down what the
  customer actually wants before they can quote it.
- **Promise:** Make it self-service. The customer does the placement work themselves
  and hands the artist something unambiguous enough to quote from.
- **Current goal:** A working prototype real people can pick up and use.

Full detail lives in `context/`. If a decision contradicts this file, this file is
stale — update it.

## How this workspace is organized

| Folder / file | What belongs there |
|---|---|
| `CLAUDE.md` | How we work. Standing rules. Rarely changes. |
| `ROADMAP.md` | What we're building, in order. The single source of "what's next". |
| `REVIEW.md` | Running log of what shipped, what we learned, what changed. |
| `context/` | Stable business truth: product, buyer, decisions, vocabulary. |
| `customers/` | One file per tattoo artist we talk to. Real quotes, not summaries. |
| `specs/` | One file per feature, written before it gets built. |
| `demos/` | Scripts and assets for showing the thing to an artist. |
| `routines/` | Repeatable procedures. Follow them literally. |
| `assets/` | The generated figure and the tools that build it. Never hand-edit output. |
| `web/` | The Next.js app. |

## Standing rules

1. **Ship the smallest thing a real person can use.** A prototype someone can click
   beats an architecture someone can admire.
2. **Write the spec before the code.** Even a short one. `specs/_template.md` exists
   so this takes five minutes, not an hour.
3. **Every feature must survive the artist test:** does this reduce the number of
   messages between customer and artist? If not, it's not on the roadmap.
4. **No accounts, no database, no payments** until the roadmap says so. Every one of
   those is a reason for someone to close the tab.
5. **Decide the routine stuff yourself.** Ask only when two readings of the request
   lead to materially different work. Log real decisions in `context/decisions.md`.
6. **Update `REVIEW.md` when something ships or something is learned.** A workspace
   nobody writes back to is just documentation.

## Technical direction

- **Stack:** Next.js (App Router) + TypeScript + Tailwind, in `web/`. The placement
  canvas renders client-side. `npm run dev --prefix web` (port 3100).
- **Fonts:** system stack, not a webfont. The app is phone-first and the system UI font
  is already the right register; a Google Font would add a network dependency to the
  build for no visible gain at these sizes.
- **Rendering:** HTML canvas / WebGL for the tattoo layer. Body parts are our own
  illustrations (SVG or high-res PNG), which means we know their geometry — that is
  what makes both contouring and real-world sizing possible.
- **Contouring:** each body-part asset ships with a displacement/normal map so the
  tattoo can be warped to the surface rather than pasted flat.
- **Scale:** each body-part asset declares a real-world reference dimension (e.g.
  "this forearm is 26 cm wrist to elbow"). Tattoo size in cm/inches falls out of that.
  The size number is the thing artists actually need to quote — treat it as a
  first-class output, not a nice-to-have.
- **Sharing:** a link that renders the finished placement plus its measurements. No
  login on either side for v1.
- **Hosting:** Vercel.

## Definition of done

A change is done when: it works on a phone browser, it doesn't require an account,
the spec file reflects what was actually built, and `REVIEW.md` has a line about it.
