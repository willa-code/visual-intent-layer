# 04: State the boundary and the stamp contract

**What to build:** Two sentences the product owes its reader, both in `README.md`.

**The boundary.** Phones, native desktop applications, design files and PDFs are outside
the product by decision, but no reader-facing document says so. The exclusion exists only
in `.scratch/visual-intent-layer/spec.md:345` and, in the positive, at
`docs/background/product-strategy.md:90-100`. Silence at the front door reads as an
oversight.

**The stamp contract.** `README.md:162-165` explains that `exact` is claimed only where an
instrumented artifact stamped a source location, but no reader-facing document names the
attribute to write. `data-vis-source`, `data-insp-path` and `code-inspector-plugin` appear
only in ADR-0021 and `src/adapters/source-stamp.ts`, so exact Source Provenance cannot be
reached by reading the front door.

**Status:** done

- [x] `README.md` rules out a phone screen, a native window, a design file and a PDF in one sentence, with the reason
- [x] The rule-out reads as a boundary rather than as an apology, and adds no support matrix
- [x] `README.md` names `data-vis-source` and `data-insp-path` as the stamp the product reads
- [x] `code-inspector-plugin` is cited as one way to produce the stamp, not taken as a dependency
- [x] The two sentences appear once each and nowhere else

## Comments

Landed 2026-09-18. `README.md` gains one sentence after the opening paragraphs — "A mobile build, a native desktop window, a design file and a PDF are outside it by decision rather than omission." — and the Provenance Confidence sentence now names the stamp it reads. Each of `data-vis-source`, `data-insp-path` and `code-inspector-plugin` appears exactly once in the file, and none appears in the surface.