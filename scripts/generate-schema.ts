import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  createContentPackageJsonSchema,
  createPublicationResultJsonSchema,
} from "../src/index.js";

const schemas = [
  {
    path: "schemas/content-package/v1.schema.json",
    value: createContentPackageJsonSchema(),
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
