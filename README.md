# Pulse Protocol

Shared, versioned data contracts for the Pulse system.

## Source of truth

Zod 4 is the single source of truth for `x-review-payload/v1`:

```text
src/x-review-payload.ts
├── runtime validation
├── inferred TypeScript types
└── generated JSON Schema
```

The committed machine-readable contract is:

```text
schemas/x-review-payload/v1.schema.json
```

The JSON Schema is generated from Zod and must never be edited by hand.

## Package API

This repository is an ESM TypeScript package. Consumers import runtime validation and inferred types from `@sharebravery/pulse-protocol`:

```ts
import {
  parseXReviewPayload,
  type XReviewPayload,
} from "@sharebravery/pulse-protocol";
```

During development, downstream repositories pin the public Git repository to a full commit SHA. Upgrades are therefore explicit and reproducible.

## Phase 1

A task AI reads the generated JSON Schema, constructs one complete payload, and pushes it to `pulse-relay/inbox/reviews/`.

## Repository scope

This repository contains contracts, generated JSON Schemas, validation fixtures, and package code. It does not contain operator state, email templates, credentials, workflows from other repositories, or publication data.

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
- Package versions and payload contract versions are independent.
- The task AI treats the generated JSON Schema as the execution contract; prose descriptions clarify semantics but do not replace validation rules.
