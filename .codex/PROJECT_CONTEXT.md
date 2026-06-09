# Codex Project Context

This file is the fast entry point for Codex when returning to the project.

## Project

`mini-shop-monitor-demo` is a lightweight C-side shop sandbox for validating a frontend monitoring system.

The project is intentionally not a complete ecommerce product. The shop exists as a controlled experiment surface for performance and stability monitoring.

## Core Goal

Validate the minimum monitoring loop:

```txt
shop page triggers a performance or stability issue
  -> monitor-sdk collects the event
  -> monitor-collector receives and stores it
  -> monitor-console queries and displays it
  -> developer confirms the monitoring signal is visible and useful
```

## Current Scope

In scope:

- Page performance
- API duration
- API failure
- Resource failure
- JS Error
- Promise Error
- Blank screen detection

Out of scope for the first implementation:

- Cart, checkout, and payment
- Business funnel analysis
- Session replay
- Sourcemap parsing
- Alerting
- Multi-environment release workflows

## Workspace Modules

```txt
apps/shop-web
apps/mock-api
apps/monitor-collector
apps/monitor-console
packages/monitor-sdk
packages/shared
```

## Main References

- Overall design: `docs/design/project-design.md`
- Engineering guide: `docs/development/engineering-guide.md`
- Module design: `docs/modules/module-design.md`
- Implementation plan: `docs/plans/implementation-plan.md`

## Default Commands

```bash
pnpm install
pnpm typecheck
pnpm build
pnpm test
```

## Working Rules

- Keep the shop business lightweight.
- Make monitoring scenarios controllable and repeatable.
- Prefer shared event types from `packages/shared`.
- Keep SDK, collector, and console boundaries independent.
- Commit completed changes with a clear conventional commit message.
