# 01: One rail, and no window-level bar

**What to build:** The Review Surface has exactly one chrome region: a full-height rail on the right holding the artifact's identity, its revision, the agent's position, the attention trigger and the Annotation list. Nothing spans the window above the artifact. The stage occupies the entire remaining area from the top edge of the window to the bottom, so the L-shaped chrome — a bar across the top with a rail starting below it — is gone. `design.md` §5 already describes this composition; this ticket makes the surface match it.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] The window contains one chrome region: the rail. No element spans the width of the window above the artifact
- [x] The stage occupies the full height of the window minus the rail width, and the artifact frame fills it
- [x] The rail is full height: its head starts at the top edge of the window, above where the artifact begins
- [x] The rail head holds the artifact name, kind, revision chip, agent position and attention trigger, and stays pinned while the list beneath it scrolls
- [x] The overflow menu holds end session, reload artifact, copy artifact path, copy evidence and open the disclosure, and no frequent action
- [x] The drawer opens over the rail rather than over the stage
- [x] `design.md` §3's metrics, spacing and radius references to a panel or a top bar no longer describe anything in the build
- [x] The vocabulary used in code for the region is rail, not panel or topbar, so a later reader is not sent looking for a bar that does not exist
- [x] The tests this change breaks are re-cut in the same change, and the suite is green when it lands

## Comments

Resolved 2026-09-17: done. The rail, the full-height stage, the pinned rail head and the overflow menu shipped in `14a73a1`; `src/ui/app.ts` mounts one rail and one stage, and `tests/browser-loop.test.ts` drives it. `design.md` §3 no longer describes a panel or a top bar.
