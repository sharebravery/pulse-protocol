# Pulse Protocol

Shared, versioned data contracts for the Pulse system.

## Source of truth

Zod 4 is the single source of truth for every contract:

```text
src/x-content.ts
src/xhs-content.ts
src/publication-result.ts
```

Each source file provides runtime validation, inferred TypeScript types, and a generated JSON Schema. Generated schemas under `schemas/` are produced by `pnpm generate`.

## Package API

Consumers import runtime parsers and inferred types from `@sharebravery/pulse-protocol`:

```ts
import {
  parsePublicationResult,
  parseXContent,
  parseXhsContent,
  type PublicationResult,
  type XContent,
  type XhsContent,
} from "@sharebravery/pulse-protocol";
```

Downstream repositories pin this public Git repository to a full commit SHA. Upgrades are explicit and reproducible.

## Current contracts

- `x-content/v1`: publishable X content, sources, optional media, and materially distinct content candidates.
- `xhs-content/v1`: publishable Xiaohongshu titles, body, tags, cover text, sources, and optional media.
- `publication-result/v1`: compact platform submission or publication outcome, including destination, status, links, and failure details.

Tasks add complete delivery inputs to `pulse-relay/inbox/ready/`.

## Repository scope

This repository contains versioned contracts, generated JSON Schemas, validation fixtures, and package code.

## Commands

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm generate
pnpm build
pnpm check
```

`pnpm check` verifies TypeScript, fixtures, generated Schema freshness, and the distributable ESM package build.

## Versioning

- Compatible optional fields may be added without changing the contract version.
- Required-field changes, removals, renames, or semantic changes create a new contract version.
- A released contract version never changes meaning.
- Package versions and contract versions are independent.
- Generated JSON Schema is the execution contract; prose clarifies semantics but does not replace validation rules.
