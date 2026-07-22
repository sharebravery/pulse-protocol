import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createXReviewPayloadJsonSchema } from "../src/x-review-payload.js";

const outputPath = resolve(process.cwd(), "schemas/x-review-payload/v1.schema.json");
const schema = createXReviewPayloadJsonSchema();

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(schema, null, 2)}\n`, "utf8");

console.log(`Generated ${outputPath}`);
