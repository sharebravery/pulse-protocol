# Pulse Protocol

Shared, versioned data contracts for the Pulse system.

## Phase 1

The first stable contract is `x-review-payload/v1`. A scheduled AI task reads `pulse-x`, constructs one complete payload, and pushes it to `pulse-relay/inbox/reviews/`.

The protocol repository contains schemas and fixtures only. It does not contain operator state, email templates, platform credentials, or workflow data.

## Commands

```bash
pnpm install
pnpm test
```

## Versioning

- Compatible optional fields may be added without changing the version.
- Required-field changes or semantic changes create a new schema version.
- A released schema version never changes meaning.
