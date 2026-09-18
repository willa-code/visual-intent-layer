# Minimalist advisor — standard-mcp-distribution

## 1. CONTEXT.md terms: delete or rename

Delete both, name nothing new. VISION.md's Effort clause asks whether a term lowers what the human spends; **Harness Detection** existed to describe code that scanned config paths before writing — that code is gone, so the term describes nothing anyone reads a card about. **Harness Registration** is subtler: registering *is* still a human act, just now performed by the Harness's own registrar instead of ours. But CONTEXT.md's job (per VISION.md, "`CONTEXT.md` owns the words") is to fix vocabulary the *product* uses on its surface or in its own prose. Nothing in the shipped surface after this change says "Registration" — the README states a command per Harness, the server self-reports a version, and that's it. Coining a replacement term to describe someone else's `opencode mcp add` is documentation about a fact the product doesn't own and can't verify (Honesty: "say only what it can know"). Keep the human act in plain English in the README's install line ("run this to register") and delete the glossary entries. A fact that lives only in another tool's docs shouldn't get a proper noun in ours.

## 2. Version self-report: every result, not only failure

Every `open_visual_review` result, per the spec. This is the correct call by Concise: "a fact lives in one place." If the version only appeared on failure, the Builder-Reviewer filing a report about odd behaviour on a *successful* call would have no way to name the build — they'd have to go dig in `package.json` or shell out to `npm ls`, which is exactly the burden VISION.md says must move into the surface, not the operator's head. It's one field, not a sentence, so it costs nothing per VISION's "no word spent by default" — it's data the agent carries, not chrome the human reads unless something goes wrong. Keep it on every result.

## 3. describeTarget fallback: leave it as `kind`, don't touch it here

Don't change it, and don't do it in this change. "Region" as a bare kind word is already what VISION.md calls a fact ("this artifact is a region") — it isn't wrong, it's terse. "An area you drew" is a judgment-flavored gloss dressed as a fact, and the Never Bends clause is explicit: "a fact and a judgment never share a word." A one-word kind label costs the human nothing to decode — it's shorter than the humanized phrase and just as clear in context (it sits next to the artifact itself, which VISION says is "the subject" the chrome only directs toward). This is also unrelated surface: the fallback string is a UI microcopy question with its own tradeoffs, not something the install/version change should carry. Correctly deferred; agree with the spec's instinct to ask but the answer is no, and not now.

## (a) Other decision I'd reverse

None on strict re-read — the README table is documentation naming registrars, not a re-implementation of the matrix; that's the right home for it (VISION.md doesn't forbid docs, it forbids doing the human's deciding for them on the *surface*).

## (b) What the spec is silent on

The MCP tool descriptions in `service.ts` are already long paragraphs of prose (e.g. `open_visual_review`'s description is one dense block). If the Skill is deleted because it "carries trigger policy" nobody measured, the tool descriptions are the new and only trigger-policy surface for the agent — the spec should say whether that prose was audited the same way, or it's just moved the unmeasured burden one file over.