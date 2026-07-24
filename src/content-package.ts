import * as z from "zod";

const CONTENT_ID_PATTERN = /^[a-z0-9][a-z0-9-]{7,127}$/;
const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const COMMIT_SHA_PATTERN = /^[0-9a-fA-F]{40}$/;
const LOCAL_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

const httpsUrlSchema = z.url({ protocol: /^https$/ });
const dateTimeSchema = z.iso.datetime({ offset: true });
const localIdSchema = z.string().regex(LOCAL_ID_PATTERN);

const uniqueIds = (items: string[]) => new Set(items).size === items.length;

export const AgentRefSchema = z.strictObject({
  name: z.enum(["pulse-x", "pulse-xhs"]),
  repository: z.string().regex(REPOSITORY_PATTERN),
  commitSha: z.string().regex(COMMIT_SHA_PATTERN),
});

export const SourceRefSchema = z.strictObject({
  sourceId: localIdSchema,
  title: z.string().min(1).max(300),
  url: httpsUrlSchema,
  publishedAt: dateTimeSchema.optional(),
  kind: z.enum(["official", "filing", "regulator", "paper", "incident-report", "reporting", "other"]).optional(),
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

export const SignalRefSchema = z.strictObject({
  signalId: localIdSchema,
  kind: z.enum(["conversation", "project", "research", "memory", "public-source"]),
  summary: z.string().min(1).max(1000),
  stage: z.enum(["idea", "in-progress", "completed", "observed"]).optional(),
  occurredAt: dateTimeSchema.optional(),
  sourceIds: z.array(localIdSchema).max(12).refine(uniqueIds, "sourceIds must be unique"),
});

const signalIdsSchema = z.array(localIdSchema).min(1).refine(uniqueIds, "signalIds must be unique");
const sourceIdsSchema = z.array(localIdSchema).max(12).refine(uniqueIds, "sourceIds must be unique");
const imageIdsSchema = z.array(localIdSchema).max(4).refine(uniqueIds, "imageIds must be unique");
const xTextSchema = z.string().min(1).max(280);

const XTargetSchema = z.strictObject({
  url: httpsUrlSchema,
  author: z.string().min(1).max(100),
  publishedAt: dateTimeSchema,
});

const xCandidateBase = {
  candidateId: localIdSchema,
  label: z.string().min(1).max(80),
  angle: z.string().min(1).max(160),
  translation: z.string().min(1).max(8000).optional(),
  signalIds: signalIdsSchema,
  sourceIds: sourceIdsSchema,
  imageIds: imageIdsSchema,
};

const XPostCandidateSchema = z.strictObject({ ...xCandidateBase, kind: z.literal("post"), text: xTextSchema });
const XReplyCandidateSchema = z.strictObject({ ...xCandidateBase, kind: z.literal("reply"), text: xTextSchema, target: XTargetSchema });
const XQuoteCandidateSchema = z.strictObject({ ...xCandidateBase, kind: z.literal("quote"), text: xTextSchema, target: XTargetSchema });
const XThreadCandidateSchema = z.strictObject({ ...xCandidateBase, kind: z.literal("thread"), posts: z.array(xTextSchema).min(2).max(20) });

export const XCandidateSchema = z.discriminatedUnion("kind", [
  XPostCandidateSchema,
  XReplyCandidateSchema,
  XQuoteCandidateSchema,
  XThreadCandidateSchema,
]);

export const XPayloadSchema = z.strictObject({
  platform: z.literal("x"),
  candidates: z.array(XCandidateSchema).min(1).max(3),
  recommendation: z.strictObject({
    candidateId: localIdSchema,
    reason: z.string().min(1).max(500),
  }).optional(),
});

export const XhsTitleSchema = z.strictObject({
  titleId: localIdSchema,
  text: z.string().min(1).max(80),
});

export const XhsPayloadSchema = z.strictObject({
  platform: z.literal("xhs"),
  signalIds: signalIdsSchema,
  sourceIds: sourceIdsSchema,
  imageIds: imageIdsSchema,
  titles: z.array(XhsTitleSchema).min(1).max(4),
  recommendedTitleId: localIdSchema,
  body: z.string().min(1).max(10000),
  tags: z.array(z.string().min(1).max(30).refine((tag) => !tag.startsWith("#"), "tags must not include the # prefix")).max(10)
    .refine((items) => new Set(items.map((item) => item.toLocaleLowerCase())).size === items.length, "tags must be unique"),
  coverText: z.string().min(1).max(40).optional(),
});

const ContentPackageStructuralSchema = z.strictObject({
  schemaVersion: z.literal("content-package/v1"),
  contentId: z.string().regex(CONTENT_ID_PATTERN),
  generatedAt: dateTimeSchema,
  displayTitle: z.string().min(1).max(120),
  agent: AgentRefSchema,
  context: z.strictObject({
    title: z.string().min(1).max(180),
    summary: z.string().min(1).max(1000),
    domains: z.array(z.string().min(1).max(80)).min(1).max(5).refine(uniqueIds, "domains must be unique"),
  }),
  signals: z.array(SignalRefSchema).min(1).max(24),
  sources: z.array(SourceRefSchema).max(12),
  images: z.array(ImageRefSchema).max(4),
  grounding: z.strictObject({
    mode: z.enum(["personal-process", "public-research", "mixed"]),
    externalFactsVerified: z.boolean(),
  }),
  payload: z.discriminatedUnion("platform", [XPayloadSchema, XhsPayloadSchema]),
}).meta({ title: "Pulse Content Package v1" });

export const ContentPackageSchema = ContentPackageStructuralSchema.superRefine((content, context) => {
  const signalIds = new Set<string>();
  const sourceIds = new Set<string>();
  const imageIds = new Set<string>();

  content.signals.forEach((signal, index) => {
    if (signalIds.has(signal.signalId)) context.addIssue({ code: "custom", path: ["signals", index, "signalId"], message: `Duplicate signalId: ${signal.signalId}` });
    signalIds.add(signal.signalId);
  });
  content.sources.forEach((source, index) => {
    if (sourceIds.has(source.sourceId)) context.addIssue({ code: "custom", path: ["sources", index, "sourceId"], message: `Duplicate sourceId: ${source.sourceId}` });
    sourceIds.add(source.sourceId);
  });
  content.images.forEach((image, index) => {
    if (imageIds.has(image.imageId)) context.addIssue({ code: "custom", path: ["images", index, "imageId"], message: `Duplicate imageId: ${image.imageId}` });
    imageIds.add(image.imageId);
  });

  content.signals.forEach((signal, index) => {
    signal.sourceIds.forEach((sourceId) => {
      if (!sourceIds.has(sourceId)) context.addIssue({ code: "custom", path: ["signals", index, "sourceIds"], message: `Signal ${signal.signalId} references missing sourceId ${sourceId}` });
    });
    if (signal.kind === "public-source" && signal.sourceIds.length === 0) {
      context.addIssue({ code: "custom", path: ["signals", index, "sourceIds"], message: "public-source signals require at least one sourceId" });
    }
  });

  const validateRefs = (signalRefs: string[], sourceRefs: string[], imageRefs: string[], path: (string | number)[]) => {
    signalRefs.forEach((id) => { if (!signalIds.has(id)) context.addIssue({ code: "custom", path: [...path, "signalIds"], message: `Missing signalId ${id}` }); });
    sourceRefs.forEach((id) => { if (!sourceIds.has(id)) context.addIssue({ code: "custom", path: [...path, "sourceIds"], message: `Missing sourceId ${id}` }); });
    imageRefs.forEach((id) => { if (!imageIds.has(id)) context.addIssue({ code: "custom", path: [...path, "imageIds"], message: `Missing imageId ${id}` }); });
  };

  if (content.payload.platform === "x") {
    if (content.agent.name !== "pulse-x") context.addIssue({ code: "custom", path: ["agent", "name"], message: "X payload requires pulse-x agent" });
    const candidateIds = new Set<string>();
    content.payload.candidates.forEach((candidate, index) => {
      if (candidateIds.has(candidate.candidateId)) context.addIssue({ code: "custom", path: ["payload", "candidates", index, "candidateId"], message: `Duplicate candidateId: ${candidate.candidateId}` });
      candidateIds.add(candidate.candidateId);
      validateRefs(candidate.signalIds, candidate.sourceIds, candidate.imageIds, ["payload", "candidates", index]);
    });
    if (content.payload.candidates.length === 1 && content.payload.recommendation) context.addIssue({ code: "custom", path: ["payload", "recommendation"], message: "recommendation must be omitted when only one candidate exists" });
    if (content.payload.candidates.length > 1 && !content.payload.recommendation) context.addIssue({ code: "custom", path: ["payload", "recommendation"], message: "recommendation is required when multiple candidates exist" });
    if (content.payload.recommendation && !candidateIds.has(content.payload.recommendation.candidateId)) context.addIssue({ code: "custom", path: ["payload", "recommendation", "candidateId"], message: "recommendation references a missing candidate" });
  } else {
    if (content.agent.name !== "pulse-xhs") context.addIssue({ code: "custom", path: ["agent", "name"], message: "XHS payload requires pulse-xhs agent" });
    validateRefs(content.payload.signalIds, content.payload.sourceIds, content.payload.imageIds, ["payload"]);
    const titleIds = new Set(content.payload.titles.map((title) => title.titleId));
    if (titleIds.size !== content.payload.titles.length) context.addIssue({ code: "custom", path: ["payload", "titles"], message: "titleIds must be unique" });
    if (!titleIds.has(content.payload.recommendedTitleId)) context.addIssue({ code: "custom", path: ["payload", "recommendedTitleId"], message: "recommendedTitleId references a missing title" });
  }

  if (content.grounding.mode !== "personal-process" && content.sources.length === 0) {
    context.addIssue({ code: "custom", path: ["sources"], message: "public-research and mixed content require at least one source" });
  }
  if (content.grounding.mode !== "personal-process" && !content.grounding.externalFactsVerified) {
    context.addIssue({ code: "custom", path: ["grounding", "externalFactsVerified"], message: "external facts must be verified" });
  }
});

export type AgentRef = z.infer<typeof AgentRefSchema>;
export type SourceRef = z.infer<typeof SourceRefSchema>;
export type ImageRef = z.infer<typeof ImageRefSchema>;
export type SignalRef = z.infer<typeof SignalRefSchema>;
export type XCandidate = z.infer<typeof XCandidateSchema>;
export type XPayload = z.infer<typeof XPayloadSchema>;
export type XhsTitle = z.infer<typeof XhsTitleSchema>;
export type XhsPayload = z.infer<typeof XhsPayloadSchema>;
export type ContentPackage = z.infer<typeof ContentPackageSchema>;

export function parseContentPackage(value: unknown): ContentPackage {
  return ContentPackageSchema.parse(value);
}

export function createContentPackageJsonSchema(): Record<string, unknown> {
  const generated = z.toJSONSchema(ContentPackageStructuralSchema, { target: "draft-2020-12", io: "input" }) as Record<string, unknown>;
  const { $schema: _generatedDialect, ...schema } = generated;
  return { $schema: "https://json-schema.org/draft/2020-12/schema", $id: "https://pulse.sharebravery.dev/schemas/content-package/v1", ...schema };
}
