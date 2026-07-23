import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  createPublicationResultJsonSchema,
  createXContentJsonSchema,
  createXhsContentJsonSchema,
} from "../src/index.js";

const schemas = [
  {
    path: "schemas/x-content/v1.schema.json",
    value: createXContentJsonSchema(),
  },
  {
    path: "schemas/xhs-content/v1.schema.json",
    value: createXhsContentJsonSchema(),
  },
  {
    path: "schemas/publication-result/v1.schema.json",
    value: createPublicationResultJsonSchema(),
  },
];

for (const schema of schemas) {
  const outputPath = resolve(process.cwd(), schema.path);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(schema.value), "utf8");
  console.log(`Generated ${outputPath}`);
}
