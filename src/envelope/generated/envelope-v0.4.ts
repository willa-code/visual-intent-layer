/* Generated from schema/envelope-v0.4.schema.json. Do not edit by hand. */

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
   * Runtime State Evidence: the state the artifact was in when the Target was pointed at, as the artifact saw it rather than as the review proxy served it. The artifact's own address stays in its own field; the documents chain records the frames the Target was reached through, each with its own address and scroll.
   */
  runtimeState?: {
    /**
     * Address of the artifact relative to its own base, including query and fragment. Absent when the artifact was at its base.
     */
    address?: string;
    /**
     * The ordered chain of documents the Target was reached through, outermost frame first. Each entry names the frame inside its parent document, that document's own address relative to its base, and the scroll it was showing. Absent when the Target lives in the artifact's own document.
     */
    documents?: {
      /**
       * Composed selector of the frame element inside its parent document, qualified by any shadow boundary it sits in.
       */
      path: string;
      /**
       * The framed document's address relative to the artifact's base, including query and fragment. Absent when it is at its base.
       */
      address?: string;
      /**
       * The framed document's scroll offset when the Target was pointed at.
       */
      scroll?: {
        x: number;
        y: number;
      };
    }[];
  };
  /**
   * The Builder-Reviewer's own act declaring that this Target no longer exists, stamped with the result revision it was made against. It never shares a word with Target Resolution's derived vocabulary: the product may only fail to find a Target, while the Builder-Reviewer may know it is gone.
   */
  declaredMissing?: {
    at: string;
    revision: string;
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
   * Runtime State Evidence: the state the artifact was in when the Target was pointed at, as the artifact saw it rather than as the review proxy served it. The artifact's own address stays in its own field; the documents chain records the frames the Target was reached through, each with its own address and scroll.
   */
  runtimeState?: {
    /**
     * Address of the artifact relative to its own base, including query and fragment. Absent when the artifact was at its base.
     */
    address?: string;
    /**
     * The ordered chain of documents the Target was reached through, outermost frame first. Each entry names the frame inside its parent document, that document's own address relative to its base, and the scroll it was showing. Absent when the Target lives in the artifact's own document.
     */
    documents?: {
      /**
       * Composed selector of the frame element inside its parent document, qualified by any shadow boundary it sits in.
       */
      path: string;
      /**
       * The framed document's address relative to the artifact's base, including query and fragment. Absent when it is at its base.
       */
      address?: string;
      /**
       * The framed document's scroll offset when the Target was pointed at.
       */
      scroll?: {
        x: number;
        y: number;
      };
    }[];
  };
  /**
   * The Builder-Reviewer's own act declaring that this Target no longer exists, stamped with the result revision it was made against. It never shares a word with Target Resolution's derived vocabulary: the product may only fail to find a Target, while the Builder-Reviewer may know it is gone.
   */
  declaredMissing?: {
    at: string;
    revision: string;
  };
};

/**
 * Experimental open schema for visually grounded human intent. Version 0.4 adds the ordered chain of documents to Runtime State Evidence, so a Target reached through a frame records the frame path, each document's own address and its scroll, and keeps the 0.3 shape readable.
 */
export interface VisualIntentEnvelope {
  /**
   * Envelope schema version. Major.minor; minor additions are backward compatible.
   */
  schemaVersion: "0.4";
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

