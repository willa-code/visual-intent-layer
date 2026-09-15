# 07: Express Relational Intent across targets

**What to build:** Relationships among targets become first-class intent with explicit operational semantics, stored implementation-neutral so the agent chooses a fitting implementation.

**Blocked by:** 04 (Submit written direction and deliver the envelope), 06 (Mark regions and select multiple targets)

**Status:** done

- [x] Ordering (before, after, inside), alignment (left, center, right, top, middle), spacing (equal gap, preserved rhythm), containment (visual group membership), equivalence (shared visible property or behavior), and comparative sizing (same width, same height) are expressible without CSS vocabulary
- [x] Each relationship is stored implementation-neutral in the envelope, preserving the desired visible relationship rather than raw coordinates
- [x] The agent receives relationships it can implement in a way consistent with the application architecture

## Comments

Implemented (implemented in 8b70d52): ordering/alignment/spacing/containment/equivalence/comparative-size in schema (schema/envelope-v0.1.schema.json), composer, review-shell relationship builder; stored implementation-neutral (no pixel fields), tested in src/ui/composer.test.ts.

Superseded: the relation type and operator pickers are removed and the operator vocabulary is reduced to relations that have a real gesture (ADR-0016). `inside` merges into containment; preserved rhythm and shared behaviour retire. Relational Intent remains first-class, implementation-neutral, and free of pixel fields.

See `.scratch/review-surface/spec.md`.
