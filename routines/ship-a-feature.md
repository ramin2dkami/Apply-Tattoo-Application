# Routine — Ship a feature

From roadmap item to shipped. Don't skip steps, especially the short ones.

1. **Spec it.** Copy `specs/_template.md`, number it in build order. One page. If you
   can't say which part of the promise it delivers, it doesn't get built.
2. **Check it against the promise.** Does this reduce messages between customer and
   artist? If no, take it off the roadmap instead of building it.
3. **Name what's out of scope.** Write it in the spec. This is where prototypes die.
4. **Build the smallest version that a person can actually use.** Not a scaffold, not
   a stub — the thin real thing.
5. **Test it on a phone.** An actual phone, in a browser, on the network. Not a
   desktop window resized to look like one.
6. **Check the whole loop still works.** Pick body part → upload → place → size →
   share. Every feature must leave that loop intact.
7. **Update the spec** to describe what shipped, not what was planned. Mark it
   `shipped`.
8. **Tick the roadmap item.**
9. **Write a `REVIEW.md` entry.** What shipped, what you learned, what changed.
10. **Show it to an artist** if it's user-visible. Log the conversation in `customers/`.

If step 4 is taking much longer than expected, the spec was too big. Split it and say
so in `REVIEW.md` — that's a learning, not a failure.
