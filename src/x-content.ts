import * as z from "zod";

const CONTENT_ID_PATTERN = /^[a-z0-9][a-z0-9-]{7,127}$/;
const ACCOUNT_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,63}$/;
const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const COMMIT_SHA_PATTERN = /^[0-9a-fA-F]{40}$/;
const LOCAL_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

const httpsUrlSchema = z
  .url({ protocol: /^https$/ })
  .describe("Public HTTPS URL. HTTP, local, credential-bearing, and non-web URLs are not allowed.");

const dateTimeSchema = z.iso
  .datetime({ offset: true })
  .describe("ISO 8601 timestamp with an explicit UTC offset or Z suffix.");

const localIdSchema = z
  .string()
  .regex(LOCAL_ID_PATTERN)
  .describe("Stable identifier local to this content document. Use letters, digits, underscores, or hyphens.");

const sourceIdsSchema = z
  .array(localIdSchema)
  .min(1)
  .refine((items) => new Set(items).size === items.length, "sourceIds must be unique")
  .describe("Unique sourceId values from the top-level sources array. Every referenced ID must exist.");

const imageIdsSchema = z
  .array(localIdSchema)
  .max(2)
  .refine((items) => new Set(items).size === items.length, "imageIds must be unique")
  .describe("Unique imageId values from the top-level images array. Use an empty array when no image adds value.");

const xTextSchema = z
  .string()
  .min(1)
  .max(280)
  .describe("Final publishable English X text. Must not exceed 280 characters.");

export const AccountRefSchema = z
  .strictObject({
    platform: z.literal("x").describe("Target platform for this content."),
    accountId: z
      .string()
      .regex(ACCOUNT_ID_PATTERN)
      .describe("Stable Pulse account identifier, such as primary."),
    handle: z
      .string()
      .min(1)
      .max(64)
      .optional()
      .describe("Optional current public X handle without changing the stable accountId."),
  })
  .describe("X account receiving the content options.");

export const OperatorRefSchema = z
  .strictObject({
    name: z.literal("pulse-x").describe("Operator that produced the content."),
    repository: z
      .string()
      .regex(REPOSITORY_PATTERN)
      .describe("GitHub repository in owner/name form containing the operator rules."),
    commitSha: z
      .string()
      .regex(COMMIT_SHA_PATTERN)
      .describe("Exact 40-character Git commit used to produce the content."),
  })
  .describe("Immutable provenance for the operator rules used during generation.");

export const SourceRefSchema = z
  .strictObject({
    sourceId: localIdSchema.describe("Unique source identifier referenced by candidates."),
    title: z.string().min(1).max(300).describe("Human-readable source title."),
    url: httpsUrlSchema.describe("Canonical public HTTPS page supporting the stated facts."),
    publishedAt: dateTimeSchema.optional().describe("Source publication time when reliably available."),
    kind: z
      .enum(["official", "filing", "regulator", "paper", "incident_report", "reporting", "other"])
      .optional()
      .describe("Optional normalized source category."),
  })
  .describe("A traceable source used to verify the event or candidate claims.");

export const ImageRefSchema = z
  .strictObject({
    imageId: localIdSchema.describe("Unique image identifier referenced by candidates."),
    url: httpsUrlSchema.describe("Direct public HTTPS image URL downloaded temporarily by Relay."),
    sourcePageUrl: httpsUrlSchema.describe("Public HTTPS page where the image originally appears."),
    alt: z.string().min(1).max(500).describe("Accessible description of the image content."),
    caption: z
      .string()
      .max(500)
      .optional()
      .describe("Optional concise explanation of why the image matters."),
    sourceName: z.string().min(1).max(120).describe("Organization or publisher that supplied the image."),
    usage: z
      .enum(["primary", "supporting"])
      .describe("Whether the image is the main visual or supporting evidence."),
  })
  .describe("Optional evidence or explanatory image. Images are never required to fill a quota.");

const TargetSchema = z
  .strictObject({
    url: httpsUrlSchema.describe("Canonical HTTPS URL of the target X post."),
    author: z.string().min(1).max(100).describe("Target post author or handle."),
    publishedAt: dateTimeSchema.describe("Verified publication time of the target post."),
  })
  .describe("Required target metadata for reply and quote candidates.");

const candidateBaseShape = {
  candidateId: localIdSchema.describe("Unique candidate identifier within this content document."),
  label: z.string().min(1).max(80).describe("Short internal label distinguishing this candidate."),
  angle: z.string().min(1).max(120).describe("The candidate's distinct editorial angle."),
  translation: z
    .string()
    .min(1)
    .max(8000)
    .describe("Faithful Simplified Chinese translation of only the publishable English copy."),
  sourceIds: sourceIdsSchema,
  imageIds: imageIdsSchema,
};

const PostCandidateSchema = z
  .strictObject({
    ...candidateBaseShape,
    kind: z.literal("post").describe("Standalone X post."),
    text: xTextSchema,
  })
  .describe("A standalone publishable X post candidate.");

const ReplyCandidateSchema = z
  .strictObject({
    ...candidateBaseShape,
    kind: z.literal("reply").describe("Direct reply to an existing X post."),
    text: xTextSchema,
    target: TargetSchema,
  })
  .describe("A publishable direct reply that adds factual or analytical value.");

const QuoteCandidateSchema = z
  .strictObject({
    ...candidateBaseShape,
    kind: z.literal("quote").describe("Quote post referencing an existing X post."),
    text: xTextSchema,
    target: TargetSchema,
  })
  .describe("A publishable quote post with a distinct value-adding perspective.");

const ThreadCandidateSchema = z
  .strictObject({
    ...candidateBaseShape,
    kind: z.literal("thread").describe("Ordered X thread."),
    posts: z
      .array(xTextSchema)
      .min(2)
      .max(20)
      .describe("Two to twenty publishable posts in final thread order."),
  })
  .describe("A multi-post X thread used only when the idea cannot be expressed clearly in one post.");

export const XCandidateSchema = z
  .discriminatedUnion("kind", [
    PostCandidateSchema,
    ReplyCandidateSchema,
    QuoteCandidateSchema,
    ThreadCandidateSchema,
  ])
  .describe("One complete X candidate: post, reply, quote, or thread.");

const XContentStructuralSchema = z
  .strictObject({
    schemaVersion: z
      .literal("x-content/v1")
      .describe("Versioned contract identifier. Change only when the data contract becomes incompatible."),
    contentId: z
      .string()
      .regex(CONTENT_ID_PATTERN)
      .describe("Globally unique, stable content identifier. Use lowercase letters, digits, and hyphens."),
    generatedAt: dateTimeSchema.describe("Time the complete content document was generated."),
    displayTitle: z
      .string()
      .min(1)
      .max(100)
      .describe("Concise title used in the Pulse X email subject and header."),
    account: AccountRefSchema,
    operator: OperatorRefSchema,
    event: z
      .strictObject({
        title: z.string().min(1).max(180).describe("Concise factual title for the underlying event."),
        whyItMatters: z
          .string()
          .min(1)
          .max(500)
          .describe("Why the event is consequential enough to publish."),
        domains: z
          .array(z.string().min(1).max(80))
          .min(1)
          .max(3)
          .refine((items) => new Set(items).size === items.length, "domains must be unique")
          .describe("Ordered editorial domains, with the primary domain first."),
      })
      .describe("Shared event context supporting every candidate."),
    sources: z
      .array(SourceRefSchema)
      .min(1)
      .max(12)
      .describe("Verified sources. sourceId values must be unique and support candidate claims."),
    images: z
      .array(ImageRefSchema)
      .max(2)
      .describe("Zero to two useful images. imageId values must be unique."),
    candidates: z
      .array(XCandidateSchema)
      .min(1)
      .max(3)
      .describe("One to three materially different, fully formed X candidates. candidateId values must be unique."),
    recommendation: z
      .strictObject({
        candidateId: localIdSchema.describe("Candidate recommended as the default option."),
        reason: z
          .string()
          .min(1)
          .max(500)
          .describe("Why this candidate is the strongest default option."),
      })
      .optional()
      .describe("Required when multiple candidates are present and omitted when only one candidate exists."),
  })
  .meta({
    title: "Pulse X Content v1",
    description:
      "Complete immutable X content produced by Pulse X and delivered by Pulse Relay. All candidate sourceIds and imageIds must resolve to top-level entries.",
  });

export const XContentSchema = XContentStructuralSchema.superRefine((content, context) => {
  const sourceIds = new Set<string>();
  const imageIds = new Set<string>();
  const candidateIds = new Set<string>();

  content.sources.forEach((source, index) => {
    if (sourceIds.has(source.sourceId)) {
      context.addIssue({
        code: "custom",
        path: ["sources", index, "sourceId"],
        message: `Duplicate sourceId: ${source.sourceId}`,
      });
    }
    sourceIds.add(source.sourceId);
  });

  content.images.forEach((image, index) => {
    if (imageIds.has(image.imageId)) {
      context.addIssue({
        code: "custom",
        path: ["images", index, "imageId"],
        message: `Duplicate imageId: ${image.imageId}`,
      });
    }
    imageIds.add(image.imageId);
  });

  content.candidates.forEach((candidate, index) => {
    if (candidateIds.has(candidate.candidateId)) {
      context.addIssue({
        code: "custom",
        path: ["candidates", index, "candidateId"],
        message: `Duplicate candidateId: ${candidate.candidateId}`,
      });
    }
    candidateIds.add(candidate.candidateId);

    candidate.sourceIds.forEach((sourceId) => {
      if (!sourceIds.has(sourceId)) {
        context.addIssue({
          code: "custom",
          path: ["candidates", index, "sourceIds"],
          message: `Candidate ${candidate.candidateId} references missing sourceId ${sourceId}`,
        });
      }
    });

    candidate.imageIds.forEach((imageId) => {
      if (!imageIds.has(imageId)) {
        context.addIssue({
          code: "custom",
          path: ["candidates", index, "imageIds"],
          message: `Candidate ${candidate.candidateId} references missing imageId ${imageId}`,
        });
      }
    });
  });

  if (content.candidates.length === 1 && content.recommendation) {
    context.addIssue({
      code: "custom",
      path: ["recommendation"],
      message: "recommendation must be omitted when only one candidate exists",
    });
  }

  if (content.candidates.length > 1 && !content.recommendation) {
    context.addIssue({
      code: "custom",
      path: ["recommendation"],
      message: "recommendation is required when multiple candidates exist",
    });
  }

  if (content.recommendation && !candidateIds.has(content.recommendation.candidateId)) {
    context.addIssue({
      code: "custom",
      path: ["recommendation", "candidateId"],
      message: `Recommendation references missing candidateId ${content.recommendation.candidateId}`,
    });
  }
});

export type AccountRef = z.infer<typeof AccountRefSchema>;
export type OperatorRef = z.infer<typeof OperatorRefSchema>;
export type SourceRef = z.infer<typeof SourceRefSchema>;
export type ImageRef = z.infer<typeof ImageRefSchema>;
export type XCandidate = z.infer<typeof XCandidateSchema>;
export type XContent = z.infer<typeof XContentSchema>;

export function parseXContent(value: unknown): XContent {
  return XContentSchema.parse(value);
}

export function createXContentJsonSchema(): Record<string, unknown> {
  const generated = z.toJSONSchema(XContentStructuralSchema, {
    target: "draft-2020-12",
    io: "input",
  }) as Record<string, unknown>;

  const { $schema: _generatedDialect, ...schema } = generated;
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://pulse.sharebravery.dev/schemas/x-content/v1",
    ...schema,
  };
}
