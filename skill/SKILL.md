# Visual Intent Layer

Use the Visual Direction Loop when pointing beats prose. Keep this skill thin: tool
contracts live in the MCP tool descriptions; this file teaches judgment.

## When visual direction beats prose

Invoke `open_visual_review` when the user's intent is lossy in words alone:

- They name a visible thing by location ("that button", "the header", "below the form").
- They compare visible things ("align these", "same size as that", "more space here").
- A previous prose-only correction already missed its target once.
- They want to verify a visual result rather than read a code diff.

Stay in plain chat when the request names files, functions, or behavior precisely, or
when no visible artifact exists yet. Never open review to browse idly; say what you
will do with the loop first.

## Running the loop

1. Call `open_visual_review` with the saved HTML path or the running localhost app URL.
   Share the returned review URL with the Builder-Reviewer and wait.
2. Poll `get_intent_status` for the submitted envelope. Targets, evidence, revision
   identity, and uncertainty arrive structured; never ask the human to re-describe
   locations the envelope already grounds.
3. Call `acknowledge_intent` when you start work. Acknowledgement is not completion.
4. Implement from the envelope's relationships and constraints, not from raw
   coordinates. Prefer the application's own layout system over pixel nudges.
5. Save. The review surface observes the new revision and re-resolves targets as
   exact, recovered, ambiguous, stale, or deleted.

## Delivery timing and fallback

- `next-pass` envelopes wait for a clean turn. Do not treat them as interruptions.
- `steering` applies at the next safe boundary the host supports, never instantly.
  On hosts without steering (including pi today), steering is held as next-pass and
  the human is told so. Never claim you stopped work you did not stop.
- The local browser is the complete review experience. If the host cannot embed the
  view, the review URL still carries the full loop; say so plainly.
- Draft and next-pass intent survives restarts. After any crash, re-read status
  rather than asking the human to repeat themselves.

## Verification belongs to the human

- Agent acknowledgement and source changes never complete an intent.
- Ambiguous targets show candidates and are never auto-resolved; stale and deleted
  targets need explicit human disposition. Deleted targets block approval.
- The loop ends when the Builder-Reviewer approves, rejects, supersedes, or marks
  the intent obsolete. Report your own uncertainty instead of forcing a match.
