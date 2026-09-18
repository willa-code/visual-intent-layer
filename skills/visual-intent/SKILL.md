---
name: visual-intent
description: Open a visual review loop when pointing at an agent-built interface beats prose. Teaches when to invoke the Visual Direction Loop, the Check-In convention, and that acknowledgement is not completion.
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
3. If the call returned without a batch, check in at your next step. Nothing is lost
   by the agent stepping away.

## Check-In is a convention, not a capability

Steering and interruption are seen at a **Check-In**: the point between your own
steps where you read new direction. There is no push channel and no wake mechanism.
A server cannot put anything into your running turn, so the product publishes the
convention instead of detecting a host capability it cannot rely on.

Call `check_in` between your own steps — not mid-step, and not only while holding
`open_visual_review`. It takes no `envelopeId`. It returns everything that arrived
since your last check-in, and it records that you checked in, which is what lets the
surface say when you last did:

- newly delivered Annotations with their delivery intent,
- **amendments** that superseded something you were already given,
- a pending **stop request**, and
- the current state of everything you were given before.

Nothing is delivered mid-step. If the human amends or interrupts while you are busy,
you will see it at the next call that returns, which hosts differ on: the next tool
call, the end of your turn, or your next turn.

### What to do when you find an amendment

An amended Annotation supersedes one you were already given. Read the successor's
note as the direction now in force, and treat what it replaced as the record of what
you were told, not as a second instruction to also satisfy. If you had already
implemented the superseded wording, say so plainly rather than silently reworking it;
nothing detects that conflict for you.

### What to do when you find a stop request

It asks you to stop and return control to the Builder-Reviewer. It is a request, not
a fact: nothing was stopped for them, and no Annotation changed state. Stop at a safe
point, and say what you stopped rather than claiming you never started.

## Receiving a batch

One batch carries one or more **Annotations**. Each Annotation has its own identity,
target evidence, note, and optional attachments. Treat them as independent units of
work:

- Implement from each Annotation's note and constraints, not from raw coordinates.
  Prefer the application's own layout system over pixel nudges.
- The product never writes style values; do not expect a pixel displacement.
- A target resolution reports **Matched**, **Recovered**, **Ambiguous** (with
  candidates, never auto-selected) or **Deleted**, and separately whether the
  Annotation was written before the revision now on screen. If the human has not
  chosen a candidate, ask rather than guessing.
- Report your own uncertainty instead of forcing a match.

## Acknowledgement, implementation and verification

`acknowledge_intent` confirms receipt. It is not implementation, and it is not
verification. Only the Builder-Reviewer completes an Annotation, by approving,
marking it Not Fixed, amending it, or marking it obsolete. A verdict is not
terminal: the Builder-Reviewer changing one is the only act that changes it.
Never describe acknowledgement as a finished correction, and never claim you
changed an artifact you have not changed.

## Delivery timing

- Sending the queue delivers **Next-Pass Intent**: work for a clean turn, not an
  interruption.
- Amending something already sent delivers **Steering Intent**: direction that
  applies at your next Check-In, never instantly.
- Asking you to stop is **Review Interruption**: a session-scoped request, seen at
  your next Check-In. Never claim you stopped work you did not stop.
- The local browser is the complete review experience. If the host cannot embed the
  view, the review URL still carries the full loop; say so plainly.
- Queued and delivered intent survives restarts. After any crash, `check_in` rather
  than asking the human to repeat themselves.

## Rejected alternatives, recorded

- The nearest canvas-agent prior art refuses check-in outright and schedules later
  requests instead. That loses direction the human meant to steer mid-work, so this
  product publishes a Check-In instead.
- Polling through the MCP Tasks extension is the one push-free pattern the
  specification sanctions. It is a form of Check-In, not a replacement for one; the
  product does not require a host to implement it.
