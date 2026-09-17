# 06: Sweep the documents to one loop

**What to build:** Every document describes one Visual Direction Loop with no
modes, and the strategy brief's screenshot claim stops contradicting
`SECURITY.md`.

**Status:** done

- [x] `README.md` names one loop and no mode, and describes the application kind as an artifact type rather than a mode
- [x] `SECURITY.md` describes the saved-HTML and proxied-application policies separately and keeps no claim that is false of either
- [x] `docs/background/product-strategy.md` drops Artifact Mode and Application Mode, and its screenshot-evidence claim is reconciled with `SECURITY.md` — stated as promised, deferred, or built
- [x] The verification skill's feature map and its running-application feature file
      (`.agents/skills/verify-visual-intent-layer/references/features/`) are renamed
      and reworded to match `CONTEXT.md`
- [x] `CONTEXT.md`'s `Target` and Runtime State Evidence entries match what ships, including the derived state label's exact wording
- [x] `docs/adr/` gains nothing that duplicates ADR-0020, and any ADR that leaned on the mode vocabulary is amended rather than rewritten silently
- [x] No document promises a capability that no code path can reach

## Comments

ADR-0020 names this sweep as a consequence and `README.md`, `SECURITY.md`,
`docs/background/product-strategy.md` and the verification skill are the four
places the mode vocabulary survives. The screenshot contradiction is
`docs/background/product-strategy.md:104` promising screenshot evidence against
`SECURITY.md:63` excluding it; whichever way the pixel decision in
`.scratch/target-evidence/spec.md` goes, the two documents must agree.

This lands last in the iteration so it describes behaviour that exists.
