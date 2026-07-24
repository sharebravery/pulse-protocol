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
  DeliveryReceiptSchema,
  createDeliveryReceiptJsonSchema,
  parseDeliveryReceipt,
} from "./delivery-receipt.js";

export type { DeliveryReceipt } from "./delivery-receipt.js";
