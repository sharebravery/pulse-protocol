import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createPublicationResultJsonSchema,
  PublicationResultSchema,
} from "../src/publication-result.js";

const base = {
  schemaVersion: "publication-result/v1" as const,
  publicationId: "publication-20260723-example",
  contentId: "article-20260723-example",
  recordedAt: "2026-07-23T15:30:00+08:00",
  content: {
    kind: "article" as const,
    title: "Example article",
    summary: "A concise summary of the generated article and its main conclusion.",
    category: "AI",
    tags: ["OpenAI", "Infrastructure"],
    metrics: {
      characterCount: 2400,
      sourceCount: 3,
      hasCover: false,
    },
  },
  destination: {
    platform: "blog" as const,
    label: "Pulse Blog",
    repository: "sharebravery/sharebravery.github.io",
    path: "docs/ai/example.md",
  },
};

describe("publication-result/v1", () => {
  it("accepts a submitted result", () => {
    const result = PublicationResultSchema.parse({
      ...base,
      status: "submitted",
      submittedAt: "2026-07-23T15:29:00+08:00",
      submissionUrl: "https://github.com/sharebravery/sharebravery.github.io/pull/1",
      commitSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    });
    expect(result.status).toBe("submitted");
  });

  it("accepts a published result", () => {
    const result = PublicationResultSchema.parse({
      ...base,
      status: "published",
      submittedAt: "2026-07-23T15:29:00+08:00",
      publishedAt: "2026-07-23T15:30:00+08:00",
      publishedUrl: "https://example.com/ai/example.html",
      commitSha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    });
    expect(result.status).toBe("published");
  });

  it("accepts a failed result", () => {
    const result = PublicationResultSchema.parse({
      ...base,
      status: "failed",
      error: {
        stage: "deployment",
        message: "VuePress build failed.",
        url: "https://github.com/sharebravery/sharebravery.github.io/actions/runs/1",
      },
    });
    expect(result.status).toBe("failed");
  });

  it("requires published URL and time for published results", () => {
    expect(() => PublicationResultSchema.parse({ ...base, status: "published" })).toThrow(
      /publishedAt|publishedUrl/,
    );
  });

  it("requires an error for failed results", () => {
    expect(() => PublicationResultSchema.parse({ ...base, status: "failed" })).toThrow(/error/);
  });

  it("rejects error details on successful results", () => {
    expect(() =>
      PublicationResultSchema.parse({
        ...base,
        status: "submitted",
        submittedAt: "2026-07-23T15:29:00+08:00",
        error: { stage: "submission", message: "Contradictory result." },
      }),
    ).toThrow(/error must be omitted/);
  });
});

describe("generated publication result JSON Schema", () => {
  it("matches the committed contract", async () => {
    const committed = JSON.parse(
      await readFile(
        resolve(process.cwd(), "schemas/publication-result/v1.schema.json"),
        "utf8",
      ),
    ) as unknown;
    expect(committed).toEqual(createPublicationResultJsonSchema());
  });
});
