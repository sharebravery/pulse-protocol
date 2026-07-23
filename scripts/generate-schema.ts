import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createXContentJsonSchema } from "../src/x-content.js";

const outputPath = resolve(process.cwd(), "schemas/x-content/v1.schema.json");
const schema = createXContentJsonSchema();

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(schema, null, 2)}\n`, "utf8");

console.log(`Generated ${outputPath}`);
