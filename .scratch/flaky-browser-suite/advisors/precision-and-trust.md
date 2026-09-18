# Advisor POV — precision and trust

Verdict: **endorse with change**.

The diff removes a silent lie. Before it, a human dragged, saw "Preview — not recorded
yet: … should come after", and nothing was recorded; the trigger was the rail's own
`renderCard()` focus, so the product cancelled the drag it had invited. A preview the
product shows but never commits is the worst trust failure on this surface — it
contradicts "what the agent was told is a record". Duplication is structurally
impossible: `onRelation` replaces by sorted target pairing, so the change cannot create
two relations for one gesture. Net: more records that agree with what the human saw.

Main risk / blind spot: the guard is narrower than the gesture. It is a listener on the
*frame's* window only. After the rail legitimately takes focus, the frame's window is
unfocused — so a later genuine loss of page focus fires `blur` on the *top* window,
which the layer does not listen to, and the drag survives with no observer. Combined
with the `setTimeout(0)` deferral, `pointDrag` can now outlive a lost gesture in a way
the old code never reached: focus moves to the card, the user switches away, returns,
and a bare `pointerup` inside the frame commits the last previewed relation. Requiring
an explicit release keeps this narrow, and I could not execute the repro, so I rank it
below the defect fixed — but it is reachable and introduced here.

Alternative: register the same `!topDocument().hasFocus()` check on `parentWindow` and
`visibilitychange`, and/or refuse to commit in `finishRelationDrag` unless the top
document still has focus — then state the refusal in words.

Test gap: the new test only proves survival; nothing pins the negative case, so
deleting the handler would still pass. Add a deterministic assertion that a real focus
loss cancels.
