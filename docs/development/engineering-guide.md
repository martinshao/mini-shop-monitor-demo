# Engineering Guide

## Repository Shape

This repository uses pnpm workspaces.

```txt
apps/*      runnable applications
packages/*  shared libraries
docs/*      design, standards, and plans
.codex/*    compact working context for Codex
```

## Package Rules

- Each app or package owns its own `package.json` and `tsconfig.json`.
- Shared contracts must live in `packages/shared`.
- SDK collection logic must live in `packages/monitor-sdk`.
- Apps should not duplicate event type strings or protocol shapes.
- Cross-module imports should use workspace package names.

## TypeScript Rules

- Keep `strict` mode enabled.
- Avoid `any` unless the boundary is truly unknown.
- Prefer explicit exported types for public module contracts.
- Keep runtime event payloads aligned with `MonitorEvent` and `MonitorEventPayload`.

## Monitoring Rules

- Every scenario should have a clear expected event type.
- Every event type should be visible in the console.
- SDK collection, collector storage, and console display should be testable independently.
- Fault scenarios should be deterministic whenever possible.

## Validation Commands

Run these before considering a change complete:

```bash
pnpm typecheck
pnpm build
```

When tests are added:

```bash
pnpm test
```

## Commit Standard

Use concise conventional commit messages:

```txt
chore: initialize monitor demo workspace
docs: add project development guides
feat: add mock product api
fix: capture resource error target safely
```

## Acceptance Standard

A feature is complete only when:

- The intended user or developer workflow is possible.
- The event contract is typed.
- The module boundary is clear.
- Local validation commands pass.
- Relevant documentation is updated when behavior or architecture changes.
