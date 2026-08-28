# Product

## One sentence

A web app where a person picks an illustrated body part, drops in the tattoo they
want, sizes and places it, and sends their artist a link that answers "where, how
big, what" without a single follow-up message.

## The problem, concretely

A customer messages an artist: "I want a snake on my forearm." The artist now needs
to know: which forearm, inner or outer, how far up, how big, wrapping or flat, what
reference image. Getting those six answers takes days of messages, often with photos
held up to mirrors and phrases like "about this big" next to a hand. The artist can't
quote until they have them, and can't book until they quote. Multiply by every
inquiry that never converts.

## The shape of the solution

The customer does the specifying, because the customer is the one who knows. We give
them a good enough visual tool that the output is unambiguous:

1. Pick a body part from a set of illustrations
2. Upload their tattoo image
3. Drag, resize, rotate until it looks right
4. Read the real-world size off the screen
5. Send the link

The artist opens the link and sees a picture plus numbers. That's a quote-able brief.

## Why illustrations instead of the customer's own photo

This is the load-bearing decision. Photos are more personal, but they are unknown
geometry: unknown scale, unknown lighting, unknown angle, and asking someone to
photograph their own back is a conversion cliff. Illustrations we draw ourselves are
known geometry — we know the reference dimensions, so size in inches is real, and we
know the surface curvature, so the tattoo can be warped to it convincingly. Photo mode
is a good "Later" feature, not a v1 one.

## What "good" looks like for v1

A person who has never seen the app opens it on their phone, and inside two minutes
has a link they're willing to send to a professional. No instructions, no account.

## How we'd know it's working

Artists tell us the messages got shorter. That's the only metric that matters right
now; everything else is a proxy.
