import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createXReviewPayloadJsonSchema,
  XReviewPayloadSchema,
} from "../src/x-review-payload.js";

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8")) as unknown;
}

async function fixturePaths(kind: "valid" | "invalid"): Promise<string[]> {
  const directory = resolve(process.cwd(), "fixtures", kind);
  return (await readdir(directory))
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => resolve(directory, name));
}

describe("x-review-payload/v1 fixtures", () => {
  it("accepts every valid fixture", async () => {
    const paths = await fixturePaths("valid");
    expect(paths.length).toBeGreaterThan(0);

    for (const path of paths) {
      const result = XReviewPayloadSchema.safeParse(await readJson(path));
      expect(result.success, `${path}: ${result.success ? "" : result.error.message}`).toBe(true);
    }
  });

  it("rejects every invalid fixture", async () => {
    const paths = await fixturePaths("invalid");
    expect(paths.length).toBeGreaterThan(0);

    for (const path of paths) {
      const result = XReviewPayloadSchema.safeParse(await readJson(path));
      expect(result.success, `${path} unexpectedly passed validation`).toBe(false);
    }
  });
});

describe("generated JSON Schema", () => {
  it("matches the committed contract", async () => {
    const committed = await readJson(
      resolve(process.cwd(), "schemas/x-review-payload/v1.schema.json"),
    );
    expect(committed).toEqual(createXReviewPayloadJsonSchema());
  });
});
