export {
  AgentRefSchema,
  ContentPackageSchema,
  ImageRefSchema,
  SignalRefSchema,
  SourceRefSchema,
  XCandidateSchema,
  XPayloadSchema,
  XhsPayloadSchema,
  XhsTitleSchema,
  createContentPackageJsonSchema,
  parseContentPackage,
} from "./content-package.js";

export type {
  AgentRef,
  ContentPackage,
  ImageRef,
  SignalRef,
  SourceRef,
  XCandidate,
  XPayload,
  XhsPayload,
  XhsTitle,
} from "./content-package.js";

export {
  PublicationResultSchema,
  createPublicationResultJsonSchema,
  parsePublicationResult,
} from "./publication-result.js";

export type { PublicationResult } from "./publication-result.js";
