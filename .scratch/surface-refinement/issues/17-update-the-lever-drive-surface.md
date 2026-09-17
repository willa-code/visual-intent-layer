# 17: Update the Lever drive surface

**What to build:** The verification harness can drive the surface this iteration builds. Its drive vocabulary still describes the deleted one, so the Verification Run in issue 13 cannot reach its own steps as written.

**Blocked by:** 03, 06, 08, 09, 19

**Status:** done

- [x] The drive vocabulary no longer offers `text`, `region` or `arrange` as tools, and offers the modes the surface has
- [x] A drive exists that returns to operating the artifact, and one that arms each mode
- [x] A drive exists for amending a sent Annotation, and one for asking an agent to stop
- [x] The intent whitelist accepts every intent the product can deliver, including an interruption request, and rejects intents the product cannot produce
- [x] The drives that click a `Review` button are replaced, since that button no longer exists
- [x] A drive exists for toggling closed rows, and one for comparing a single row's revisions
- [x] Every drive reports an unreachable step with its exact command and unmet precondition, as the harness already does
- [x] `tests/lever-contract.test.ts` passes against the updated surface, and the harness's own help text matches the commands it accepts

## Comments

Added after independent review, which found issue 13's drives would return exit 4: the harness clicks a `Review` button that issue 01 deletes, whitelists `element|text|region|arrange`, excludes `review-interruption`, and has no amend or stop command.

Resolved 2026-09-17: done. The Lever's drive vocabulary (modes point/box/operate, amend, stop, closed-rows, compare) matches the shipped surface, and `tests/lever-contract.test.ts` passes against it.
