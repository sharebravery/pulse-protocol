import * as z from "zod";

const ID_PATTERN = /^[a-z0-9][a-z0-9-]{7,127}$/;
const dateTimeSchema = z.iso.datetime({ offset: true });
const httpsUrlSchema = z.url({ protocol: /^https$/ });

const DeliveryReceiptStructuralSchema = z.strictObject({
  schemaVersion: z.literal("delivery-receipt/v1"),
  receiptId: z.string().regex(ID_PATTERN),
  contentId: z.string().regex(ID_PATTERN),
  recordedAt: dateTimeSchema,
  channel: z.enum(["email", "repository", "platform", "other"]),
  destination: z.string().min(1).max(300),
  status: z.enum(["accepted", "delivered", "failed"]),
  externalRef: z.string().min(1).max(500).optional(),
  url: httpsUrlSchema.optional(),
  error: z.strictObject({
    stage: z.string().min(1).max(80),
    message: z.string().min(1).max(2000),
  }).optional(),
}).meta({ title: "Pulse Delivery Receipt v1" });

export const DeliveryReceiptSchema = DeliveryReceiptStructuralSchema.superRefine((receipt, context) => {
  if (receipt.status === "failed" && !receipt.error) {
    context.addIssue({ code: "custom", path: ["error"], message: "error is required when delivery fails" });
  }
  if (receipt.status !== "failed" && receipt.error) {
    context.addIssue({ code: "custom", path: ["error"], message: "error must be omitted unless delivery fails" });
  }
});

export type DeliveryReceipt = z.infer<typeof DeliveryReceiptSchema>;

export function parseDeliveryReceipt(value: unknown): DeliveryReceipt {
  return DeliveryReceiptSchema.parse(value);
}

export function createDeliveryReceiptJsonSchema(): Record<string, unknown> {
  const generated = z.toJSONSchema(DeliveryReceiptStructuralSchema, { target: "draft-2020-12", io: "input" }) as Record<string, unknown>;
  const { $schema: _generatedDialect, ...schema } = generated;
  return { $schema: "https://json-schema.org/draft/2020-12/schema", $id: "https://pulse.sharebravery.dev/schemas/delivery-receipt/v1", ...schema };
}
