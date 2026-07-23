import * as z from "zod";
import { ImageRefSchema, SourceRefSchema } from "./x-content.js";

const CONTENT_ID_PATTERN = /^[a-z0-9][a-z0-9-]{7,127}$/;
const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const COMMIT_SHA_PATTERN = /^[0-9a-fA-F]{40}$/;
const LOCAL_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

const dateTimeSchema = z.iso.datetime({ offset: true });
const localIdSchema = z.string().regex(LOCAL_ID_PATTERN);

export const XhsOperatorRefSchema = z.strictObject({
  name: z.literal("pulse-xhs"),
  repository: z.string().regex(REPOSITORY_PATTERN),
  commitSha: z.string().regex(COMMIT_SHA_PATTERN),
});

export const XhsTitleSchema = z.strictObject({
  titleId: localIdSchema,
  text: z.string().min(1).max(80),
});

const XhsContentStructuralSchema = z
  .strictObject({
    schemaVersion: z.literal("xhs-content/v1"),
    contentId: z.string().regex(CONTENT_ID_PATTERN),
    generatedAt: dateTimeSchema,
    displayTitle: z.string().min(1).max(100),
    operator: XhsOperatorRefSchema,
    event: z.strictObject({
      title: z.string().min(1).max(180),
      whyItMatters: z.string().min(1).max(500),
      domains: z
        .array(z.string().min(1).max(80))
        .min(1)
        .max(3)
        .refine((items) => new Set(items).size === items.length, "domains must be unique"),
    }),
    sources: z.array(SourceRefSchema).min(1).max(12),
    images: z.array(ImageRefSchema).max(4),
    titles: z.array(XhsTitleSchema).min(1).max(4),
    recommendedTitleId: localIdSchema,
    body: z.string().min(1).max(10000),
    tags: z
      .array(
        z
          .string()
          .min(1)
          .max(30)
          .refine((tag) => !tag.startsWith("#"), "tags must not include the # prefix"),
      )
      .max(10)
      .refine((items) => new Set(items.map((item) => item.toLocaleLowerCase())).size === items.length, "tags must be unique"),
    coverText: z.string().min(1).max(40).optional(),
  })
  .meta({ title: "Pulse XHS Content v1" });

export const XhsContentSchema = XhsContentStructuralSchema.superRefine((content, context) => {
  const sourceIds = new Set<string>();
  const imageIds = new Set<string>();
  const titleIds = new Set<string>();

  content.sources.forEach((source, index) => {
    if (sourceIds.has(source.sourceId)) context.addIssue({ code: "custom", path: ["sources", index, "sourceId"], message: `Duplicate sourceId: ${source.sourceId}` });
    sourceIds.add(source.sourceId);
  });

  content.images.forEach((image, index) => {
    if (imageIds.has(image.imageId)) context.addIssue({ code: "custom", path: ["images", index, "imageId"], message: `Duplicate imageId: ${image.imageId}` });
    imageIds.add(image.imageId);
  });

  content.titles.forEach((title, index) => {
    if (titleIds.has(title.titleId)) context.addIssue({ code: "custom", path: ["titles", index, "titleId"], message: `Duplicate titleId: ${title.titleId}` });
    titleIds.add(title.titleId);
  });

  if (!titleIds.has(content.recommendedTitleId)) context.addIssue({ code: "custom", path: ["recommendedTitleId"], message: `recommendedTitleId references missing titleId ${content.recommendedTitleId}` });
});

export type XhsOperatorRef = z.infer<typeof XhsOperatorRefSchema>;
export type XhsTitle = z.infer<typeof XhsTitleSchema>;
export type XhsContent = z.infer<typeof XhsContentSchema>;

export function parseXhsContent(value: unknown): XhsContent {
  return XhsContentSchema.parse(value);
}

export function createXhsContentJsonSchema(): Record<string, unknown> {
  const generated = z.toJSONSchema(XhsContentStructuralSchema, { target: "draft-2020-12", io: "input" }) as Record<string, unknown>;
  const { $schema: _generatedDialect, ...schema } = generated;
  return { $schema: "https://json-schema.org/draft/2020-12/schema", $id: "https://pulse.sharebravery.dev/schemas/xhs-content/v1", ...schema };
}
