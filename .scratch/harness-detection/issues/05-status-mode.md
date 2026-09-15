# 05: Read-only status mode

**What to build:** The Builder-Reviewer can ask what is actually registered, where, and whether it is current, without changing anything. A read-only status mode reports per Harness the Registration state, the location or command it applies to, the chosen transport, and the detection evidence that produced it — and never touches disk.

**Blocked by:** 03 (Content-verified registration).

**Status:** done

- [x] A read-only status mode reports per Harness: Registration state, location or command, chosen transport, and detection evidence
- [x] Nothing is written or created, including directories, when status runs
- [x] The harness filter narrows the listing
- [x] Preview and apply keep their current meaning and are unaffected
- [x] Invalid configuration surfaces in status output rather than being hidden
- [x] Tests assert an unchanged filesystem and the full reported fields

## Comments

Reference points: `herdr integration status [--outdated-only]` and `npx skills list`. No new install verb is added: the harness filter already covers explicit per-Harness registration.
### Implementation notes

`formatStatus` reuses the detection header and adds one `registrations:` line per
target with the registration state, location or command, and any differing
fields, followed by one `evidence:` line per present harness naming what matched.
`visual-intent setup --status` plans, prints, and never applies; it sets a
non-zero exit code when a target refuses. `--status` forces preview semantics in
the CLI so a combined `--status --print-only` cannot write.

Evidence: tests assert state labels for not-registered, current, and outdated
registrations, the evidence line, and that no file or directory appears after a
status render. The CLI smoke run confirmed an unchanged sandbox filesystem.

### Code-review follow-up

`--status` set a non-zero exit code when a target refused, which issue 05 never
asked for; it is read-only reporting, so it now always exits zero and simply
prints the refusal. The status render also follows the same configuration-home
overrides as detection now, so it no longer points at a file the harness would
not read.
