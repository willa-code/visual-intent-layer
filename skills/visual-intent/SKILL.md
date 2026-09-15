---
name: visual-intent
description: Open a visual review loop when pointing at an agent-built interface beats prose. Teaches when to invoke the Visual Direction Loop, host-dependent waiting, and that acknowledgement is not completion.
---

# Visual Intent Layer

Use the Visual Direction Loop when pointing beats prose. Keep this skill thin:
tool contracts live in the MCP tool descriptions; this file teaches judgment.

## When visual direction beats prose

Invoke `open_visual_review` when the user's intent is lossy in words alone:

- They name a visible thing by location ("that button", "the header", "below the form").
- They compare visible things ("align these", "same size as that", "more space here").
- A previous prose-only correction already missed its target once.
- They want to verify a visual result rather than read a code diff.

Stay in plain chat when the request names files, functions, or behavior precisely, or
when no visible artifact exists yet. Never open review to browse idly; say what you
will do with the loop first.

## Invoking the loop

1. Call `open_visual_review` with the saved HTML path or the running localhost app URL.
   The default browser opens on the machine running the service; you do not need to
   ask the user to copy a URL.
2. Where the host can hold a tool call, `open_visual_review` waits while the human
   composes Annotations and returns one batch when they send. Where the host cannot
   hold the call, the tool returns after its wait window with `status:
   "stepped-away"`, and the Annotations stay queued durably on the machine.
3. If the call returned without a batch, read `get_intent_status` when the user says
   they have sent. Nothing is lost by the agent stepping away.

## Receiving a batch

The Review Surface has exactly two states. **Review** is where the human
exercises the artifact and composes Annotations. **Verify** is where the
resulting revision is compared against the Annotations written for it and each
one is decided. You receive work from Review; you are judged in Verify.

One batch carries one or more **Annotations**. Each Annotation has its own
identity, target evidence, note, optional attachments, and optional Relational
Intent. Treat them as independent units of work:

- Implement from each Annotation's relationship and constraints, not from raw
  coordinates. Prefer the application's own layout system over pixel nudges.
- The product never writes style values; do not expect a pixel displacement.
- A target resolution reports **Matched**, **Recovered**, **Ambiguous** (with
  candidates, never auto-selected) or **Deleted**, and separately whether the
  Annotation was written before the revision now on screen. If the human has not
  chosen a candidate, ask rather than guessing.
- Report your own uncertainty instead of forcing a match.

## Acknowledgement, implementation and verification

`acknowledge_intent` confirms receipt. It is not implementation, and it is not
verification. Only the Builder-Reviewer completes an Annotation, by approving,
rejecting with another pass, superseding, or marking it obsolete. Never describe
acknowledgement as a finished correction, and never claim you changed an artifact
you have not changed.

## Delivery timing

- `next-pass` Annotations wait for a clean turn. Do not treat them as interruptions.
- `steering` applies at the next safe boundary the host supports, never instantly.
  On hosts without steering, steering is held as next-pass and the human is told so.
  Never claim you stopped work you did not stop.
- The local browser is the complete review experience. If the host cannot embed the
  view, the review URL still carries the full loop; say so plainly.
- Draft and queued intent survives restarts. After any crash, re-read status rather
  than asking the human to repeat themselves.