# Dogfood and preview verdicts (ticket 17)

Status: deferred — requires the ticket 01 baseline plus repeated real use.

**Trigger:** the Verification Run of `.scratch/several-targets-and-relations/`, the
first feature spec after `.scratch/truth-and-sync/`, plus maintainer time — 2026-09-17.
Parked by maintainer decision; see
`.scratch/truth-and-sync/issues/06-park-verification-with-a-named-trigger.md`.

Blocked by: 01 (baseline), 09 (benchmark signals), 10 (previews), 14 (skill),
15 (instrumentation), 16 (pi validation).

## Method

Perform representative corrections on real work with this product, recording the
same fields as `baseline.md`. Then judge:

## Corrections with the product

(One section per correction, same fields as the baseline plus setup friction.)

## Intent Preview verdicts

Superseded by `.scratch/several-targets-and-relations/`. The `preview` object named
below left the wire when `schema/envelope-v0.2.schema.json` was cut — only
`schema/envelope-v0.1.schema.json:110` carries it — and no preview code exists in
`src/ui`, so drag-to-reorder, align and match-size never reached the surface as
separate previews. The reversible preview folded into the relation gesture that
`.scratch/several-targets-and-relations/` owns. The table is kept as the record of
what was asked for; it is not an open question.

| Preview | Keep or kill | Evidence (explanation/correction effort vs selection plus text) |
| ------- | ------------ | --------------------------------------------------------------- |
| drag-to-reorder | superseded | the preview field left the wire at `0.2`; the relation gesture owns it |
| align | superseded | the preview field left the wire at `0.2`; the relation gesture owns it |
| match-size | superseded | the preview field left the wire at `0.2`; the relation gesture owns it |

Interaction evidence for each verdict was going to be recorded on the envelope's
`preview` field (`interactionEvidence.startedAt/confirmedAt/discardedAt`), which
left the wire at `0.2` and is not in `0.3`; see the supersession note above.

## Repeat use

- Did you voluntarily choose the product again? (instances and dates)
- What pulled you back, or what sent you back to screenshot-and-chat?

## Personal Proof checklist

From the spec boundary: Artifact Mode, React/Vite Application Mode,
selection plus relations plus experimental previews, versioned envelope, MCP
baseline delivery, browser fallback, durable Draft and Next-Pass lifecycle,
honest steering labels, resolution with abstention, restart recovery, baseline
comparison evidence. Check off or explicitly defer each with reasons.
