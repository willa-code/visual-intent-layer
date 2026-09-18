# Vision

Status: normative. Every product decision defers to this file before local taste,
before implementation convenience, and before a technical preference. `CONTEXT.md`
owns the words; `design.md` owns the surface; this file owns what we are trying to be.

## The thesis

A human can convey intent precisely. Free-form text cannot: it is lossy, slow to
locate, and ambiguous about what "there" means. Moving that intent into a
higher-fidelity space — pointing at the actual thing and saying what should
change — raises the precision of the instruction, and precise instructions let an
agent do more precise and better work.

This is the whole reason the product exists: **raise the fidelity of human intent,
and agent output follows.** Every capability earns its place by making some intent
expressible that words alone would flatten, or make slow, or make ambiguous.

## The product value

The Review Surface is a first-class piece of UI/UX, not a form over a data model.
That is the product's value, not a coat of paint on it.

- **Concise.** The chrome says only what the human needs at that moment. A fact
  lives in one place; a word is spent, never spent by default.
- **Minimal.** One control, one claim. If a sentence can become a mark, it
  becomes a mark. If a control can become a gesture, it becomes a gesture.
- **Intuitive.** The gesture reveals the capability. A capable operator should
  sense what to do before reading a sentence about it.
- **Beautiful.** Warm, calm, deliberate. It reads as a tool for people who care
  about the work, never as a web form.
- **Never overwhelming.** No wall of wording, no paragraph where a mark will do,
  no control the human has to decode before acting.

## How we decide

For every decision, ask in this order:

1. **Precision.** Does it raise the fidelity of the intent a human can express?
2. **Effort.** Does it lower what the human spends — clicks, reading, thinking?
3. **Calm.** Does it keep the surface minimal, intuitive and beautiful?
4. **Honesty.** Does it keep the product saying only what it can know?
5. **Ambition.** Now that this is known, can the technical boundary be pushed
   further to serve 1–4?

An option that is technically honest but burdens the human loses to a design that
makes the same distinction effortless. **The burden moves into the surface, never
into the operator's head.**

## What never bends

- The artifact is the subject; chrome only directs and judges. The artifact is
  judged, never consulted.
- What the agent was told is a record. A later act supersedes it; nothing rewrites
  it in place.
- Only the human completes intent. The product may derive, but never declares done.
- A fact and a judgment never share a word.