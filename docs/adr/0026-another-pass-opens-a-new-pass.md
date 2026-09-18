# Another Pass opens a new Pass

**Status:** accepted

A Pass is one delivery and the artifact revision that answers it, so asking the
agent to attempt the open Annotations again opens a **new** Pass rather than
re-delivering the old one. The act carries every member that has not been accepted
and not been abandoned — not verified, not obsolete, not replaced — into a new Pass
delivered as Next-Pass Intent. They are delivered again, so their resolutions and
their verdict are cleared and they wait to be answered by a later revision. The
Pass that was answered closes with its outcome and its result revision frozen, and
its header states how many members it carried on.

**Considered Options:** Re-delivering the same Pass was rejected because its
outcome counts and revision range describe one attempt, and resetting them in place
would destroy the record of what the first attempt earned. Carrying copies of the
Annotations rather than the Annotations themselves was rejected because an
Annotation is durable and individually identified, and a copy would break the
identity the agent already holds. Carrying every member, including accepted and
abandoned ones, was rejected because "try again" is a request about what is still
open, and a note that was approved or dropped has nothing to attempt.

**Consequences:** The batch idempotency key gains a salt so that carrying the same
members into a new Pass is not mistaken for a repeat of the delivery that already
carried them; without the salt the store would hand back the closed Pass. The
carried members move to the new Pass, so the ledger renders them once, under the
attempt being answered, while the closed Pass keeps its member identities, its
counts and its result revision. `design.md` §6 and §11 are amended and `CONTEXT.md`
states that Another Pass opens a new Pass. ADR-0019 is extended rather than
reversed: a Pass is still the unit of review, and only the Builder-Reviewer closes
one.