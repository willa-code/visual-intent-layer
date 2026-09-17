/* Generated from schema/envelope-v0.3.schema.json. Do not edit by hand. */

export type Target = {
  [k: string]: any;
} & {
  targetId: string;
  kind: "element" | "text-range" | "region";
  renderedGrounding: RenderedGrounding;
  sourceProvenance?: SourceProvenance;
  provenanceConfidence: "exact" | "inferred" | "unavailable";
  label?: string;
  regionEvidence?: RegionEvidence;
  /**
   * Runtime State Evidence: the state the artifact was in when the Target was pointed at, as the artifact saw it rather than as the review proxy served it.
   */
  runtimeState?: {
    /**
     * Address of the artifact relative to its own base, including query and fragment. Absent when the artifact was at its base.
     */
    address?: string;
  };
} & {
  targetId: string;
  kind: "element" | "text-range" | "region";
  renderedGrounding: RenderedGrounding;
  sourceProvenance?: SourceProvenance;
  provenanceConfidence: "exact" | "inferred" | "unavailable";
  label?: string;
  regionEvidence?: RegionEvidence;
  /**
   * Runtime State Evidence: the state the artifact was in when the Target was pointed at, as the artifact saw it rather than as the review proxy served it.
   */
  runtimeState?: {
    /**
     * Address of the artifact relative to its own base, including query and fragment. Absent when the artifact was at its base.
     */
    address?: string;
  };
};

/**
 * Experimental open schema for visually grounded human intent. Version 0.3 adds Runtime State Evidence to every Target, recording the address the artifact was showing, and keeps the 0.2 shape readable.
 */
export interface VisualIntentEnvelope {
  /**
   * Envelope schema version. Major.minor; minor additions are backward compatible.
   */
  schemaVersion: "0.3";
  /**
   * Stable identifier so retries and redelivery are idempotent.
   */
  envelopeId: string;
  artifact: {
    /**
     * Stable artifact identity independent of filesystem spelling or host conversation.
     */
    id: string;
    /**
     * Artifact adapter kind. New kinds extend the contract without breaking the core.
     */
    kind: "saved-html" | "react-vite-app";
    /**
     * Immutable content-addressed revision: blake3 over canonical artifact bytes plus local asset manifest.
     */
    revision: string;
    displayName?: string;
    sourceUri?: string;
  };
  /**
   * One or more Annotations. Each Annotation is independently identified and verified.
   *
   * @minItems 1
   */
  annotations: [Annotation, ...Annotation[]];
  delivery: {
    intent: "draft" | "steering" | "next-pass" | "review-interruption";
    /**
     * Stable key so repeated delivery cannot create silent duplicates.
     */
    idempotencyKey: string;
    requestedAt?: string;
  };
  /**
   * Provenance Confidence across the batch: exact source span, inferred, or unavailable. Never a target-resolution claim.
   */
  confidence?: {
    level: "exact" | "inferred" | "unavailable";
    notes?: string;
    abstentions?: string[];
  };
  /**
   * Optional host-, browser-, and framework-specific records. Never required portable semantics.
   */
  extensions?: {
    host?: {
      [k: string]: any;
    };
    browser?: {
      [k: string]: any;
    };
    framework?: {
      [k: string]: any;
    };
    [k: string]: any;
  };
  createdAt: string;
  updatedAt?: string;
}
export interface Annotation {
  annotationId: string;
  /**
   * Human-written direction. Empty only for a relation- or region-only annotation.
   */
  note: string;
  /**
   * @minItems 1
   */
  targets: [Target, ...Target[]];
  relationships?: Relationship[];
  references?: Reference[];
  attachments?: Attachment[];
  /**
   * Whether the annotation was written against the revision being compared.
   */
  revisionRelation?: "current" | "advanced";
}
/**
 * Evidence identifying a target within the visible artifact. Not a source claim.
 */
export interface RenderedGrounding {
  /**
   * CSS selectors as evidence, not portable identity.
   */
  selectors?: string[];
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
    viewportWidth?: number;
    viewportHeight?: number;
    devicePixelRatio?: number;
    scrollX?: number;
    scrollY?: number;
  };
  textEvidence?: {
    exactText?: string;
    prefix?: string;
    suffix?: string;
    startOffset?: number;
    endOffset?: number;
  };
  semanticRole?: string;
  accessibleName?: string;
  structuralContext?: {
    ancestorChain?: string[];
    siblingIndex?: number;
    siblingCount?: number;
  };
  geometry?: {
    centerX?: number;
    centerY?: number;
  };
}
/**
 * Exact editable source location, supplied only by an instrumented adapter.
 */
export interface SourceProvenance {
  file: string;
  line: number;
  column: number;
  component?: string;
  adapter: string;
  sourceSpan?: string;
}
/**
 * A drawn region records the revision and scroll position it was drawn at.
 */
export interface RegionEvidence {
  revision: string;
  scrollX: number;
  scrollY: number;
}
/**
 * Relational Intent among targets, stored implementation-neutral with no pixel fields.
 */
export interface Relationship {
  relationshipId: string;
  type: "ordering" | "alignment" | "spacing" | "containment" | "equivalence" | "comparative-size";
  /**
   * Implementation-neutral operator; valid values depend on type.
   */
  operator:
    | "before"
    | "after"
    | "align-left"
    | "align-center"
    | "align-right"
    | "align-top"
    | "align-middle"
    | "equal-gap"
    | "member-of"
    | "shared-property"
    | "same-width"
    | "same-height";
  /**
   * @minItems 1
   */
  targetIds: [string, ...string[]];
  /**
   * For equivalence: the visible property that should match.
   */
  property?: string;
}
export interface Reference {
  referenceId: string;
  kind: "image" | "url" | "text" | "envelope";
  uri?: string;
  note?: string;
}
/**
 * Content-addressed reference to bytes stored locally by the review service.
 */
export interface Attachment {
  attachmentId: string;
  mediaType: string;
  byteLength: number;
  sha256: string;
  name?: string;
}

