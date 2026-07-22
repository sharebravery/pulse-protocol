import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const root = process.cwd();
const schema = JSON.parse(await readFile(resolve(root, "schemas/x-review-payload/v1.schema.json"), "utf8"));
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validate = ajv.compile(schema);

async function checkDirectory(kind, expectedValid) {
  const directory = resolve(root, `fixtures/${kind}`);
  const files = (await readdir(directory)).filter((name) => name.endsWith(".json")).sort();
  if (files.length === 0) throw new Error(`No ${kind} fixtures found`);

  for (const file of files) {
    const value = JSON.parse(await readFile(resolve(directory, file), "utf8"));
    const valid = validate(value);
    if (valid !== expectedValid) {
      throw new Error(`${kind}/${file} produced ${valid}; errors: ${ajv.errorsText(validate.errors)}`);
    }
    console.log(`✓ ${kind}/${file}`);
  }
}

await checkDirectory("valid", true);
await checkDirectory("invalid", false);
