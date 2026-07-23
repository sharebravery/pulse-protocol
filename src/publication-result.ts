import * as z from "zod";

const ID_PATTERN = /^[a-z0-9][a-z0-9-]{7,127}$/;
const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const COMMIT_SHA_PATTERN = /^[0-9a-fA-F]{40}$/;

const dateTimeSchema = z.iso
  .datetime({ offset: true })
  .describe("ISO 8601 timestamp with an explicit UTC offset or Z suffix.");

const httpsUrlSchema = z
  .url({ protocol: /^https$/ })
  .describe("Public HTTPS URL. HTTP, local, credential-bearing, and non-web URLs are not allowed.");

const ContentSummarySchema = z
  .strictObject({
    kind: z.enum(["article", "social_post"]).describe("Kind of content submitted to the platform."),
    title: z.string().min(1).max(200).describe("Human-readable content title."),
    summary: z.string().min(1).max(1000).describe("Concise summary suitable for a status email."),
    category: z.string().min(1).max(80).optional().describe("Optional article or platform category."),
    tags: z
      .array(z.string().min(1).max(80))
      .max(10)
      .refine((items) => new Set(items).size === items.length, "tags must be unique")
      .optional()
      .describe("Optional distinct tags."),
    metrics: z
      .strictObject({
        characterCount: z.number().int().nonnegative().optional(),
        sourceCount: z.number().int().nonnegative().optional(),
        hasCover: z.boolean().optional(),
      })
      .optional()
      .describe("Optional compact content metrics used only for status reporting."),
  })
  .describe("Compact metadata for the published or submitted content.");

const DestinationSchema = z
  .strictObject({
    platform: z
      .enum(["blog", "x", "xhs", "wechat", "zhihu", "toutiao", "other"])
      .describe("Destination platform."),
    label: z.string().min(1).max(100).optional().describe("Optional human-readable destination name."),
    repository: z
      .string()
      .regex(REPOSITORY_PATTERN)
      .optional()
      .describe("Optional GitHub repository in owner/name form."),
    path: z.string().min(1).max(500).optional().describe("Optional repository or platform content path."),
  })
  .describe("Platform and location receiving the content.");

const PublicationErrorSchema = z
  .strictObject({
    stage: z.string().min(1).max(80).describe("Operation stage that failed."),
    message: z.string().min(1).max(2000).describe("Concise failure message."),
    url: httpsUrlSchema.optional().describe("Optional workflow, log, or platform URL."),
  })
  .describe("Failure details when publication does not complete.");

const PublicationResultStructuralSchema = z
  .strictObject({
    schemaVersion: z.literal("publication-result/v1"),
    publicationId: z
      .string()
      .regex(ID_PATTERN)
      .describe("Globally unique publication attempt identifier."),
    contentId: z
      .string()
      .regex(ID_PATTERN)
      .describe("Stable identifier of the content being submitted or published."),
    recordedAt: dateTimeSchema.describe("Time this publication result was recorded."),
    status: z
      .enum(["submitted", "published", "failed"])
      .describe("Current platform outcome for this publication attempt."),
    content: ContentSummarySchema,
    destination: DestinationSchema,
    submissionUrl: httpsUrlSchema
      .optional()
      .describe("Optional platform submission, pull request, or edit URL."),
    publishedUrl: httpsUrlSchema
      .optional()
      .describe("Canonical public URL after successful publication."),
    commitSha: z
      .string()
      .regex(COMMIT_SHA_PATTERN)
      .optional()
      .describe("Optional exact Git commit associated with the platform submission."),
    submittedAt: dateTimeSchema.optional().describe("Time the content was submitted to the destination."),
    publishedAt: dateTimeSchema.optional().describe("Time the content became publicly available."),
    error: PublicationErrorSchema.optional(),
  })
  .meta({
    title: "Pulse Publication Result v1",
    description:
      "Compact outcome of submitting or publishing Pulse content to a destination platform. It is suitable for deterministic status delivery and does not contain the full content body.",
  });

export const PublicationResultSchema = PublicationResultStructuralSchema.superRefine((result, context) => {
  if (result.status === "submitted" && !result.submittedAt) {
    context.addIssue({
      code: "custom",
      path: ["submittedAt"],
      message: "submittedAt is required when status is submitted",
    });
  }

  if (result.status === "published") {
    if (!result.publishedAt) {
      context.addIssue({
        code: "custom",
        path: ["publishedAt"],
        message: "publishedAt is required when status is published",
      });
    }
    if (!result.publishedUrl) {
      context.addIssue({
        code: "custom",
        path: ["publishedUrl"],
        message: "publishedUrl is required when status is published",
      });
    }
  }

  if (result.status === "failed" && !result.error) {
    context.addIssue({
      code: "custom",
      path: ["error"],
      message: "error is required when status is failed",
    });
  }

  if (result.status !== "failed" && result.error) {
    context.addIssue({
      code: "custom",
      path: ["error"],
      message: "error must be omitted unless status is failed",
    });
  }
});

export type PublicationResult = z.infer<typeof PublicationResultSchema>;

export function parsePublicationResult(value: unknown): PublicationResult {
  return PublicationResultSchema.parse(value);
}

export function createPublicationResultJsonSchema(): Record<string, unknown> {
  const generated = z.toJSONSchema(PublicationResultStructuralSchema, {
    target: "draft-2020-12",
    io: "input",
  }) as Record<string, unknown>;

  const { $schema: _generatedDialect, ...schema } = generated;
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://pulse.sharebravery.dev/schemas/publication-result/v1",
    ...schema,
  };
}
