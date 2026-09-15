/* Generated from schema/envelope-v0.1.schema.json. Do not edit by hand. */

export type Target = {
  [k: string]: any;
} & {
  targetId: string;
  kind: "element" | "text-range" | "region";
  renderedGrounding: RenderedGrounding;
  sourceProvenance?: SourceProvenance;
  provenanceConfidence: "exact" | "recovered" | "ambiguous" | "unavailable" | "stale";
  label?: string;
} & {
  targetId: string;
  kind: "element" | "text-range" | "region";
  renderedGrounding: RenderedGrounding;
  sourceProvenance?: SourceProvenance;
  provenanceConfidence: "exact" | "recovered" | "ambiguous" | "unavailable" | "stale";
  label?: string;
};

/**
 * Experimental open schema for visually grounded human intent. Version 0.1.
 */
export interface VisualIntentEnvelope {
  /**
   * Envelope schema version. Major.minor; minor additions are backward compatible.
   */
  schemaVersion: "0.1";
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
   * One or more visible target descriptions. Multiple targets form one target set.
   *
   * @minItems 1
   */
  targets: [Target, ...Target[]];
  /**
   * Relational Intent among targets, stored implementation-neutral.
   */
  relationships?: Relationship[];
  /**
   * Human-written direction attached to the target set.
   */
  direction: string;
  constraints?: string[];
  /**
   * Supporting references demonstrating desired appearance or behavior.
   */
  references?: Reference[];
  delivery: {
    intent: "draft" | "steering" | "next-pass" | "review-interruption";
    /**
     * Stable key so repeated delivery cannot create silent duplicates.
     */
    idempotencyKey: string;
    requestedAt?: string;
  };
  confidence?: {
    level: "exact" | "recovered" | "ambiguous" | "unavailable" | "stale";
    notes?: string;
    abstentions?: string[];
  };
  /**
   * Envelope id this envelope replaces, when the Builder-Reviewer supersedes outdated direction.
   */
  supersedes?: string;
  preview?: IntentPreview;
  /**
   * Optional canvas-, host-, browser-, and framework-specific records. Never required portable semantics.
   */
  extensions?: {
    canvas?: {
      [k: string]: any;
    };
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
  screenshotRef?: string;
  stableRuntimeId?: string;
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
export interface Relationship {
  relationshipId: string;
  type: "ordering" | "alignment" | "spacing" | "containment" | "equivalence" | "comparative-size";
  /**
   * Implementation-neutral operator; valid values depend on type.
   */
  operator:
    | "before"
    | "after"
    | "inside"
    | "align-left"
    | "align-center"
    | "align-right"
    | "align-top"
    | "align-middle"
    | "equal-gap"
    | "preserved-rhythm"
    | "member-of"
    | "shared-property"
    | "shared-behavior"
    | "same-width"
    | "same-height";
  /**
   * @minItems 1
   */
  targetIds: [string, ...string[]];
  /**
   * For equivalence: the visible property or behavior that should match.
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
 * Reversible visual proposal. Records the demonstrated arrangement plus interaction evidence.
 */
export interface IntentPreview {
  previewId: string;
  kind: "drag-to-reorder" | "align" | "match-size";
  reversible: true;
  relationshipIds?: string[];
  interactionEvidence?: {
    startedAt?: string;
    confirmedAt?: string;
    discardedAt?: string;
    [k: string]: any;
  };
}

