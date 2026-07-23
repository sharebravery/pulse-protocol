import * as z from "zod";
import { ImageRefSchema, SourceRefSchema } from "./x-content.js";

const CONTENT_ID_PATTERN = /^[a-z0-9][a-z0-9-]{7,127}$/;
const ACCOUNT_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,63}$/;
const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const COMMIT_SHA_PATTERN = /^[0-9a-fA-F]{40}$/;
const LOCAL_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

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
  .max(12)
  .refine((items) => new Set(items).size === items.length, "sourceIds must be unique")
  .describe("Source IDs supporting the final Xiaohongshu content. Every referenced ID must exist.");

const imageIdsSchema = z
  .array(localIdSchema)
  .max(4)
  .refine((items) => new Set(items).size === items.length, "imageIds must be unique")
  .describe("Image IDs intended for the final post. Use an empty array when no image adds value.");

export const XhsAccountRefSchema = z
  .strictObject({
    platform: z.literal("xhs").describe("Target platform for this content."),
    accountId: z
      .string()
      .regex(ACCOUNT_ID_PATTERN)
      .describe("Stable Pulse account identifier, such as primary."),
    displayName: z
      .string()
      .min(1)
      .max(80)
      .optional()
      .describe("Optional current public account name without changing the stable accountId."),
  })
  .describe("Xiaohongshu account receiving the content.");

export const XhsOperatorRefSchema = z
  .strictObject({
    name: z.literal("pulse-xhs").describe("Operator that produced the content."),
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

export const XhsTitleSchema = z
  .strictObject({
    titleId: localIdSchema.describe("Unique title identifier within this content document."),
    text: z.string().min(1).max(80).describe("Complete publishable Xiaohongshu title."),
  })
  .describe("One complete title option for the final post.");

const XhsContentStructuralSchema = z
  .strictObject({
    schemaVersion: z
      .literal("xhs-content/v1")
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
      .describe("Concise title used in the Pulse XHS email subject and header."),
    account: XhsAccountRefSchema,
    operator: XhsOperatorRefSchema,
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
      .describe("Event context supporting the final Xiaohongshu post."),
    sources: z
      .array(SourceRefSchema)
      .min(1)
      .max(12)
      .describe("Verified sources. sourceId values must be unique and support the final post."),
    images: z
      .array(ImageRefSchema)
      .max(4)
      .describe("Zero to four useful images. imageId values must be unique."),
    titles: z
      .array(XhsTitleSchema)
      .min(1)
      .max(4)
      .describe("One to four materially different title options. titleId values must be unique."),
    recommendedTitleId: localIdSchema.describe("Title recommended as the default option."),
    body: z.string().min(1).max(10000).describe("Complete publishable Simplified Chinese post body."),
    tags: z
      .array(
        z
          .string()
          .min(1)
          .max(30)
          .refine((tag) => !tag.startsWith("#"), "tags must not include the # prefix"),
      )
      .max(10)
      .refine(
        (items) => new Set(items.map((item) => item.toLocaleLowerCase())).size === items.length,
        "tags must be unique",
      )
      .describe("Zero to ten Xiaohongshu tags without # prefixes."),
    coverText: z
      .string()
      .min(1)
      .max(40)
      .optional()
      .describe("Optional concise text intended for the cover image."),
    sourceIds: sourceIdsSchema,
    imageIds: imageIdsSchema,
  })
  .meta({
    title: "Pulse XHS Content v1",
    description:
      "Complete immutable Xiaohongshu content produced by Pulse XHS and delivered by Pulse Relay. Referenced sourceIds, imageIds, and recommendedTitleId must resolve to top-level entries.",
  });

export const XhsContentSchema = XhsContentStructuralSchema.superRefine((content, context) => {
  const sourceIds = new Set<string>();
  const imageIds = new Set<string>();
  const titleIds = new Set<string>();

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

  content.titles.forEach((title, index) => {
    if (titleIds.has(title.titleId)) {
      context.addIssue({
        code: "custom",
        path: ["titles", index, "titleId"],
        message: `Duplicate titleId: ${title.titleId}`,
      });
    }
    titleIds.add(title.titleId);
  });

  content.sourceIds.forEach((sourceId) => {
    if (!sourceIds.has(sourceId)) {
      context.addIssue({
        code: "custom",
        path: ["sourceIds"],
        message: `Content references missing sourceId ${sourceId}`,
      });
    }
  });

  content.imageIds.forEach((imageId) => {
    if (!imageIds.has(imageId)) {
      context.addIssue({
        code: "custom",
        path: ["imageIds"],
        message: `Content references missing imageId ${imageId}`,
      });
    }
  });

  if (!titleIds.has(content.recommendedTitleId)) {
    context.addIssue({
      code: "custom",
      path: ["recommendedTitleId"],
      message: `recommendedTitleId references missing titleId ${content.recommendedTitleId}`,
    });
  }
});

export type XhsAccountRef = z.infer<typeof XhsAccountRefSchema>;
export type XhsOperatorRef = z.infer<typeof XhsOperatorRefSchema>;
export type XhsTitle = z.infer<typeof XhsTitleSchema>;
export type XhsContent = z.infer<typeof XhsContentSchema>;

export function parseXhsContent(value: unknown): XhsContent {
  return XhsContentSchema.parse(value);
}

export function createXhsContentJsonSchema(): Record<string, unknown> {
  const generated = z.toJSONSchema(XhsContentStructuralSchema, {
    target: "draft-2020-12",
    io: "input",
  }) as Record<string, unknown>;

  const { $schema: _generatedDialect, ...schema } = generated;
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://pulse.sharebravery.dev/schemas/xhs-content/v1",
    ...schema,
  };
}
