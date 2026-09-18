# Minimalist advisor — readme-front-door

README.md is 337 lines and 16 headings (9 `##`, 7 `###`): a manual wearing a front
door. The change is right. The proposal, rendered, is still ~9 headings, four of
them one fact each.

## 1. How short is the identity paragraph

One sentence, not a paragraph of one clause per noun. The person in front of this
file is deciding *is this my tool, and how do I register it* — nothing else. Only the
loop (`README.md:3-5`) serves that decision. The Annotation-as-unit-of-work (`7-10`)
and several targets/relations (`12-15`) make a stranger learn two proper nouns before
deciding to care; they are guide material. The artifact boundary (`17-19`) is the
exception: it decides whether the product can be for you at all, so fold it into
Requirements as a clause ("a saved HTML document or a local web app"); the exclusion
list goes to the guide. VISION's "if a sentence can become a mark, it becomes a
mark" binds hardest at the door. Shape: *point at what you see and say what should
change; the agent changes exactly that, and you verify by hand.*

## 2. Do uninstall facts belong in the README

Not as a per-Harness command table. State the act; let the Harness own the verb —
the verdict `standard-mcp-distribution` reached for install, where the path was "its
most drift-prone code and its least honest surface." Removal lives in the same
Harness-owned config as registration, and the spec itself records that `opencode mcp`
has no remove verb (`spec.md:75`) and pi's is `/mcp disable`, not removal. A table
ships a wrong word at best and a hole at worst. The premise that removal is "the
first question after a first attempt that did not work" (`spec.md:16-17`) is answered
by item 7 — the Harness's own panel names the failure — not by uninstall; removal is
the last question. One sentence in the guide, plus our own `npm uninstall -g
visual-intent-layer`.

## 3. Contributor material

One file. Append `Develop` (`268-296`) and `Layout` (`298-317`) to the tail of
`docs/guide.md`: a second docs file makes the door's reader choose a link, and
nothing at the door would point at `docs/development.md`. Trim while moving — the
gallery paragraph (`287-296`) is ten lines of CI procedure, and `Layout`'s seventeen
bullets restate the tree, which already lives in the tree. Flag `Layout` as the next
deletion.

## 4. The no-agent CLI route

Guide. `visual-intent open`/`serve` (`57-70`) is a route for a different act —
driving the surface without an agent — and its 14 lines (block plus explanatory
paragraph) are exactly the manual-at-the-door cost this change exists to remove. If
it stays at the door at all, one sentence and one command, never the block. The
failure facts (items 7 and 8) stay: they decide whether the product can work at all.

## 5. Does the README keep a `docs/` index

One link. The door keeps `docs/guide.md` and `SECURITY.md` only. The four-entry index
(`319-327`) moves to the guide's tail: `ls docs/` shows no index file today, so if it
is not moved, `docs/adr` and `docs/agents` become unreachable. Those trees serve
people working in this repository, not someone registering a server.

## (a) Decisions I would reverse

1. **The ten-item outline is itself the overwhelm.** Items 2, 5, 6, 7 and 8 are each
   one fact, and each buys a heading. Fold Requirements and the local-machine fact
   into one "can this work for me" block; fold Update, Uninstall and Troubleshooting
   into one short "If something is off" section under Install. Six headings, ~80
   lines. A heading the reader scans to learn it holds one sentence is chrome.
2. **Uninstall out of the outline's top level**, per position 2. It is a rare act;
   the door's structure should say so.

## (b) What the spec is silent on

- `## Maintaining this package` (`README.md:328-333`) appears in neither the proposed
  outline nor the `docs/` target list. The maintain skill is a real entry point; it
  needs a named home or it evaporates.
- The problem statement says "seventeen H2 sections" (`spec.md:7`); the file has 9
  H2 and 7 H3. The verdict stands; the count should be right.
