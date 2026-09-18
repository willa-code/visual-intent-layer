# Independent review — precision and trust engineer

Lens: a decision earns its place only if it lets a human say something more precisely without spending more effort, and never lets the surface claim more than the product actually knows — so my bias is to keep boundaries people can see and refuse controls and fields nobody has asked for yet.

## DECISION 1 — R4 multi-page: KEEP the refusal, and record it as accepted rather than pending

**VERDICT: KEEP.**

**WHY:** The thesis is that pointing at the real thing raises the fidelity of intent (VISION.md, "The thesis"). A second document cannot be pointed at: `serveArtifactAsset` routes any `text/html` asset to `serveOutsideDocumentNotice` rather than injecting the layer (`src/service/http.ts:1489`, `:1506-1508`), so a page served "as a page" would be a surface that looks pointable and is not — the exact overclaim VISION.md forbids under Honesty ("keeps the product saying only what it can know") and `design.md` §1 precedence 3 forbids structurally ("The surface must not imply a state the domain does not have"). The refusal already ships and names itself in words with a way back (`.scratch/target-evidence/issues/02`, status done; the notice body in `http.ts:1549+`). Recording it as *accepted* is honest only if we record what is accepted: the shipped boundary is accepted; the multi-page *capability* is still unowned in `.scratch/backlog.md` ("target-evidence named it as a later feature"). Do not relabel the unbuilt capability as refused — no ADR refuses it.

**BOLDER:** None. The shipped notice already turns a silent boundary into a named one and offers the product's own way back, at the cost of nothing until the human actually hits it. The only "bolder" alternative — serving each linked document *with* the layer — is a capability with a new document-set identity and a cross-page revision base, not a free fidelity raise, and the backlog's promotion trigger (dogfood friction on a real multi-page site) has not fired.

## DECISION 2 — R5 rule-out sentences: WRITE them

**VERDICT: KEEP.**

**WHY:** The boundary is stated only positively: `docs/background/product-strategy.md:90` defines support as "browser-rendered surfaces", and `README.md` carries no negative sentence at all (grep for phone/mobile/Safari/Figma/PDF/native returns only an unrelated "natively" at `README.md:28`). Silence here is not minimalism; it is an incomplete claim, and Honesty (VISION.md decision #4) is exactly what a stated boundary protects. A rule-out costs no control and no interaction — it is a word spent once, in the one place the boundary already lives.

**BOLDER:** The boldest honest form is *one* sentence, not four. The four-item list is four words where one will do, and `design.md` §2's own rule ("a word is spent, never spent by default") argues against a list. Frame the boundary as an inclusion rule that names the four in one breath — "the product reviews a browser-rendered surface; a phone screen, a native window, a design file and a PDF are not one" — and place it at `product-strategy.md:90-100`, never in the surface, which must stay quiet. (`design.md` §11's disregarded note already treats "the reviewed artifact is a locally served web document" as the boundary sentence.)

## DECISION 3 — T2 two tabs: PARK; do nothing now

**VERDICT: KEEP.**

**WHY:** One open mints one session and the review URL is shareable, so a second tab attaches to the same record and the same stored Annotations (`SessionRecords`, `src/service/sessions.ts:35-47`, persisted to `service-sessions.json`); `http.ts` has no lock, version check or push, and Pass A refused one *by name*: "A revision history, a second reviewer, or a lock or version check between two browser sessions. Last-write-wins stays for now" (`.scratch/surface-refinement-pass-a/spec.md:374-375`). A lock raises no intent fidelity — it does not let one human say more; it prevents a corruption the stated single user (CONTEXT.md, **Builder-Reviewer**) does not hit. Building it speculatively would force a new conflict state into the surface, which `design.md` §1 precedence 3 forbids.

**BOLDER:** None. Any honest lock is a new stored fact and a new word the surface would have to explain, and there is no evidence of a lost write. Evidence that would unpark it is named in `.scratch/backlog.md`: "a real second session loses writing, or a hosted/multi-machine path is wanted."

## DECISION 4 — E7 declared state: PARK

**VERDICT: KEEP.**

**WHY:** Runtime State Evidence is the address, viewport, scroll and the ordered frame chain (CONTEXT.md **Runtime State Evidence**; `schema/envelope-v0.4.schema.json`) — no dialog, tab, filter, form value or accordion. The product already answers the *recorded* half honestly: the derived label "**May exist only in a state no longer on screen**" fires when a recorded axis (address, viewport, scroll, frame) differs while the revision has not changed, and it is derived at read time, never stored (CONTEXT.md, same entry). Your failure case — point inside a modal, close the modal — is a state the product records nothing about, so an unrecorded change can surface as `deleted`, which blocks approval (`design.md` §4, Resolution). The gap is real. But capturing arbitrary app state means modelling each framework's own route/modal/filter model, an unbounded claim that violates VISION.md's Honesty floor. `backlog.md` is right that it "wants a dogfood case before it is designed."

**BOLDER:** None now. When unparked, the smallest honest slice is *not* a new stored field: it is letting the already-derived label cover an unrecorded state change that the product can still detect within the axes it already stores, and refusing the rest as unavailable. Evidence that unparked it: "a dogfood correction fails because the state, not the target, is what moved" (`.scratch/backlog.md`).

## DECISION 5 — R8 suggested re-points: PARK

**VERDICT: KEEP.**

**WHY:** Re-pointing by hand ships (`.scratch/surface-refinement-pass-a/issues/06`; `RepointAction`, `design.md:296`). The idea's only *honest* form already ships too: `CandidateMark` is "drawn on the artifact, never presented as a ranked list; carries no evidence figure" (`design.md:295`), and §5 says the surface "never presents a ranked list of candidates with a figure beside each" because "a number that cannot be checked is asserted rather than shown." §10 restates both as anti-patterns ("A numeric confidence, percentage or score anywhere in chrome"; "A ranked list of resolution candidates", `design.md:444-446`). So "the product proposes where it moved" is precisely the part that would overclaim — the product can mark candidates but cannot know *which* one is right. Parking is correct.

**BOLDER:** None. The honest ceiling is already built — candidates marked on the artifact, no list, no figure. Anything beyond it is a claim about a match the product has no basis to make. Unpark trigger (`.scratch/backlog.md`): "re-pointing by hand proves to be the friction in real use."

## DECISION 6 — P9 own stamp transform: PARK, leave ADR-0021's trigger in place

**VERDICT: KEEP.**

**WHY:** `src/adapters/source-stamp.ts:13-19` reads the product's own `data-vis-source` **and** `data-insp-path` (`code-inspector-plugin`), so the contract is owned and the transform is not shipped; `Exact` provenance is unreachable without the plugin. ADR-0021 refused owning per-framework transforms "for now" because "maintaining other people's compilers is not this product's job," and it named its own trigger. Shipping a transform raises no *intent* fidelity — it widens one evidence axis — and the honesty floor already holds: with no stamp, provenance reads `unavailable`, never a weaker "exact" (ADR-0021; CONTEXT.md **Provenance Confidence**). Not building it speculatively respects both the trigger and VISION.md decision #2 (Effort), since a per-framework transform is ongoing work with no human-facing gain yet.

**BOLDER:** None. The contract already accepts either attribute and degrades honestly. The trigger ADR-0021 names — "relying on the third-party stamp proves annoying" — is the only evidence that should move this.

## DECISION 7 — T1 redaction: record disclosure as the whole, deliberate mitigation

**VERDICT: KEEP**, with one sharpening.

**WHY:** `SECURITY.md:51-52` states the review UI "discloses exactly which evidence an envelope carries before delivery" and offers no affordance to change it (verified: no redaction/change language anywhere in `SECURITY.md`). A Captured View can carry a token or secret (ADR-0022), so this is, as `backlog.md` itself says, "the only item in this file whose absence is already consequential, because pixels ship today." Recording disclosure as the deliberate mitigation turns an omission into a decision — but a mitigation with no act behind it is itself an overclaim. The honest record must name the exits that already exist: an unsent Annotation is `private` (CONTEXT.md, **Annotation**; `design.md` §4 Annotation role), and `TakeBackAction` returns an uncollected delivery to the queue (`design.md:298`) — so the human can act on the disclosure without leaving the machine. A crop/mask tool would add a control, effort and a new claim; VISION.md decision #2 requires it to earn that.

**BOLDER:** The boldest honest form is one sentence, not a capability: state plainly in `SECURITY.md` beside the disclosure at `SECURITY.md:51-52` that nothing leaves the machine until the Builder-Reviewer sends, so the disclosure plus the exits already in the surface — an unsent Annotation reads `private` (CONTEXT.md, **Annotation**; `design.md` §4) and `TakeBackAction` returns an uncollected delivery to the queue (`design.md:298`) — *are* the whole mitigation, deliberately stated rather than implied. That raises trust without adding a control, a crop tool, or a word the human has to decode, and it keeps the product claiming exactly what it can know: that it will tell you what an envelope carries, and that you decide whether it ever carries it.
