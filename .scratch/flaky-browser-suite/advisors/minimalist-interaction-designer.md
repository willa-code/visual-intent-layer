# Advisor POV — minimalist interaction designer

Verdict: **endorse with change**.

The layer fix is right and minimal. The layer owns a gesture's lifetime, and a drag
outliving a focus move inside the same page is exactly that invariant, encoded at
`src/ui/artifact/layer.ts:1156-1165`. `topDocument().hasFocus()` on a tick is the
correct discriminator. Real abandonment survives: page loses focus, `Escape`,
`pointercancel`, and release outside the frame. The new test asserts the *recorded*
relation, not just preview text — that is the right assertion.

It is not the smallest behaviour, though. The root defect is untouched: `renderCard()`
ends with unconditional `textarea.focus()` and reruns from `onSelection` after
`createAnnotation`/`refresh()`, so whether the caret leaves the artifact is decided by
HTTP latency, not by the human. Post-fix the drag survives, but the surface still moves
the caret mid-gesture: the human's pointer is over the artifact while their keystrokes
belong to the rail. VISION: the burden moves into the surface, never into the
operator's head. The harmful keys are gated, so damage is bounded — the caret theft is
not.

Blind spot: because focus legitimately stays in the rail for the rest of the drag, the
frame receives no keydown, so the layer's Escape cancel is unreachable; the shell's
Escape instead clears the active annotation, after which `onRelation` drops the
released drag silently. The abandon gesture now lives on a different surface with a
different meaning.

Alternative: gate the auto-focus on a shell-local pointer-down flag, or focus the note
only for a human-initiated selection — never for a render caused by `refresh()`.
