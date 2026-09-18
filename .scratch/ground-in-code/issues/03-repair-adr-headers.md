# 03: Repair the three ADRs that drifted without an amendment header

Status: done

**What to build:** Three ADRs describe mechanisms the code no longer has, and unlike
their siblings they carry no status header telling a reader so. This is drift that
predates the distribution change, so it is fixed on its own terms.

- [x] `docs/adr/0002` — the "one self-describing model-visible MCP entry tool" claim is
      contradicted by four tools (`src/mcp/service.ts:606-673`). Add a header pointing
      at ADR-0018, which records the growth to a Check-In call.
- [x] `docs/adr/0012` — the verb list "approve, reject, supersede, or mark obsolete" is
      retired by ADR-0025 (`reject` → Not Fixed) and ADR-0026 (`supersede` → Another
      Pass / Replacement at the Pass level). Add a header naming both.
- [x] `docs/adr/0019` — the Pass state list omits `withdrawn` (rendered "Taken back")
      and includes `open`, which no creation path assigns (`src/annotation/store.ts`).
      Record the reachable set, or say plainly that `open` is reserved and unwritten.
- [x] Check that every other ADR in 0001–0030 either matches the code or carries a
      header; `audit/04` and `audit/05` name the ones that were verified as matching.

**Evidence:** `audit/04-adr-0001-0015.md`, `audit/05-adr-0016-0030.md`.

## Comments

Landed. 0002 gains a blockquote naming ADR-0018 and the four real tools; 0012 gains
one naming ADR-0025 and ADR-0026 and the retired verbs; 0019 gains a `**Corrected**`
note recording that `open` is assigned by no code path and that "Taken back" was
missing from the list. Each follows the convention its siblings already use — 0008's
blockquote and 0024/0025's `**Amended by**` paragraphs — so the record is marked
rather than rewritten.

The fourth box is satisfied by the lanes that did the check: `audit/04` and
`audit/05` verified every ADR in 0001–0030 against `src/**` and name the ones that
match, with amendment headers already in place, plus ADR-0004 which correctly marks
itself superseded by 0013. Nothing beyond these three needed a new header.
