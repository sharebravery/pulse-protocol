# Pulse Protocol

Shared, versioned data contracts for the Pulse system.

## Phase 1

The first stable contract is `x-review-payload/v1`. A task AI reads the generated JSON Schema, constructs one complete payload, and pushes it to `pulse-relay/inbox/reviews/`.

Zod 4 is the single source of truth:

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

## Repository scope

This repository contains contracts, generated JSON Schemas, and validation fixtures. It does not contain operator state, email templates, credentials, workflows from other repositories, or publication data.

## Commands

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm generate
pnpm check
```

`pnpm check` verifies TypeScript, fixtures, and that committed generated Schemas are current.

## Versioning

- Compatible optional fields may be added without changing the version.
- Required-field changes, removals, renames, or semantic changes create a new schema version.
- A released schema version never changes meaning.
- The task AI treats the generated JSON Schema as the execution contract; prose descriptions clarify semantics but do not replace validation rules.
