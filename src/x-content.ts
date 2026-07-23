import * as z from "zod";

const CONTENT_ID_PATTERN = /^[a-z0-9][a-z0-9-]{7,127}$/;
const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const COMMIT_SHA_PATTERN = /^[0-9a-fA-F]{40}$/;
const LOCAL_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

const httpsUrlSchema = z.url({ protocol: /^https$/ });
const dateTimeSchema = z.iso.datetime({ offset: true });
const localIdSchema = z.string().regex(LOCAL_ID_PATTERN);

const sourceIdsSchema = z
  .array(localIdSchema)
  .min(1)
  .refine((items) => new Set(items).size === items.length, "sourceIds must be unique");

const imageIdsSchema = z
  .array(localIdSchema)
  .max(2)
  .refine((items) => new Set(items).size === items.length, "imageIds must be unique");

const xTextSchema = z.string().min(1).max(280);

export const OperatorRefSchema = z.strictObject({
  name: z.literal("pulse-x"),
  repository: z.string().regex(REPOSITORY_PATTERN),
  commitSha: z.string().regex(COMMIT_SHA_PATTERN),
});

export const SourceRefSchema = z.strictObject({
  sourceId: localIdSchema,
  title: z.string().min(1).max(300),
  url: httpsUrlSchema,
  publishedAt: dateTimeSchema.optional(),
  kind: z.enum(["official", "filing", "regulator", "paper", "incident_report", "reporting", "other"]).optional(),
});

export const ImageRefSchema = z.strictObject({
  imageId: localIdSchema,
  url: httpsUrlSchema,
  sourcePageUrl: httpsUrlSchema,
  alt: z.string().min(1).max(500),
  caption: z.string().max(500).optional(),
  sourceName: z.string().min(1).max(120),
  usage: z.enum(["primary", "supporting"]),
});

const TargetSchema = z.strictObject({
  url: httpsUrlSchema,
  author: z.string().min(1).max(100),
  publishedAt: dateTimeSchema,
});

const candidateBaseShape = {
  candidateId: localIdSchema,
  label: z.string().min(1).max(80),
  angle: z.string().min(1).max(120),
  translation: z.string().min(1).max(8000),
  sourceIds: sourceIdsSchema,
  imageIds: imageIdsSchema,
};

const PostCandidateSchema = z.strictObject({ ...candidateBaseShape, kind: z.literal("post"), text: xTextSchema });
const ReplyCandidateSchema = z.strictObject({ ...candidateBaseShape, kind: z.literal("reply"), text: xTextSchema, target: TargetSchema });
const QuoteCandidateSchema = z.strictObject({ ...candidateBaseShape, kind: z.literal("quote"), text: xTextSchema, target: TargetSchema });
const ThreadCandidateSchema = z.strictObject({ ...candidateBaseShape, kind: z.literal("thread"), posts: z.array(xTextSchema).min(2).max(20) });

export const XCandidateSchema = z.discriminatedUnion("kind", [
  PostCandidateSchema,
  ReplyCandidateSchema,
  QuoteCandidateSchema,
  ThreadCandidateSchema,
]);

const XContentStructuralSchema = z
  .strictObject({
    schemaVersion: z.literal("x-content/v1"),
    contentId: z.string().regex(CONTENT_ID_PATTERN),
    generatedAt: dateTimeSchema,
    displayTitle: z.string().min(1).max(100),
    operator: OperatorRefSchema,
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
    images: z.array(ImageRefSchema).max(2),
    candidates: z.array(XCandidateSchema).min(1).max(3),
    recommendation: z
      .strictObject({
        candidateId: localIdSchema,
        reason: z.string().min(1).max(500),
      })
      .optional(),
  })
  .meta({ title: "Pulse X Content v1" });

export const XContentSchema = XContentStructuralSchema.superRefine((content, context) => {
  const sourceIds = new Set<string>();
  const imageIds = new Set<string>();
  const candidateIds = new Set<string>();

  content.sources.forEach((source, index) => {
    if (sourceIds.has(source.sourceId)) context.addIssue({ code: "custom", path: ["sources", index, "sourceId"], message: `Duplicate sourceId: ${source.sourceId}` });
    sourceIds.add(source.sourceId);
  });

  content.images.forEach((image, index) => {
    if (imageIds.has(image.imageId)) context.addIssue({ code: "custom", path: ["images", index, "imageId"], message: `Duplicate imageId: ${image.imageId}` });
    imageIds.add(image.imageId);
  });

  content.candidates.forEach((candidate, index) => {
    if (candidateIds.has(candidate.candidateId)) context.addIssue({ code: "custom", path: ["candidates", index, "candidateId"], message: `Duplicate candidateId: ${candidate.candidateId}` });
    candidateIds.add(candidate.candidateId);
    candidate.sourceIds.forEach((sourceId) => {
      if (!sourceIds.has(sourceId)) context.addIssue({ code: "custom", path: ["candidates", index, "sourceIds"], message: `Candidate ${candidate.candidateId} references missing sourceId ${sourceId}` });
    });
    candidate.imageIds.forEach((imageId) => {
      if (!imageIds.has(imageId)) context.addIssue({ code: "custom", path: ["candidates", index, "imageIds"], message: `Candidate ${candidate.candidateId} references missing imageId ${imageId}` });
    });
  });

  if (content.candidates.length === 1 && content.recommendation) context.addIssue({ code: "custom", path: ["recommendation"], message: "recommendation must be omitted when only one candidate exists" });
  if (content.candidates.length > 1 && !content.recommendation) context.addIssue({ code: "custom", path: ["recommendation"], message: "recommendation is required when multiple candidates exist" });
  if (content.recommendation && !candidateIds.has(content.recommendation.candidateId)) context.addIssue({ code: "custom", path: ["recommendation", "candidateId"], message: `Recommendation references missing candidateId ${content.recommendation.candidateId}` });
});

export type OperatorRef = z.infer<typeof OperatorRefSchema>;
export type SourceRef = z.infer<typeof SourceRefSchema>;
export type ImageRef = z.infer<typeof ImageRefSchema>;
export type XCandidate = z.infer<typeof XCandidateSchema>;
export type XContent = z.infer<typeof XContentSchema>;

export function parseXContent(value: unknown): XContent {
  return XContentSchema.parse(value);
}

export function createXContentJsonSchema(): Record<string, unknown> {
  const generated = z.toJSONSchema(XContentStructuralSchema, { target: "draft-2020-12", io: "input" }) as Record<string, unknown>;
  const { $schema: _generatedDialect, ...schema } = generated;
  return { $schema: "https://json-schema.org/draft/2020-12/schema", $id: "https://pulse.sharebravery.dev/schemas/x-content/v1", ...schema };
}
