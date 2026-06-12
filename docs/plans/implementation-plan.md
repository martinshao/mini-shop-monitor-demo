# Implementation Plan

## Stage 0: Project Initialization

Status: done

Deliverables:

- Git repository
- `.gitignore`
- pnpm workspace
- TypeScript base config
- `packages/shared`
- Project README

## Stage 1: Main Directories and Documentation

Status: done

Deliverables:

- Main app directories
- Main package directories
- Minimal package entry files
- Codex project context
- Design and development markdown documents

Acceptance:

- `pnpm typecheck` passes.
- `pnpm build` passes.
- Each planned app and package has a clear responsibility.
- Documentation answers where project design, development rules, module design, and implementation plan live.

## Stage 2: Business Experiment Surface

Status: done

Deliverables:

- `apps/shop-web` runnable web app
- `apps/mock-api` runnable NestJS API service backed by PostgreSQL
- Home page
- Product list page
- Product detail page
- Fault lab page

Acceptance:

- Shop pages can be opened locally.
- Shop pages can call mock API.
- Fault lab can trigger at least one API failure and one JS error.

## Stage 3: SDK Minimum Collection

Status: done

Deliverables:

- SDK initialization
- Event creation
- Event reporting
- Page performance collection
- API duration and failure collection
- JS Error and Promise Error collection
- Resource failure collection
- Blank screen detection

Acceptance:

- Each first-phase event type can be triggered.
- Each event includes app, env, release, page URL, timestamp, SDK version, type, and data.

## Stage 4: Collector and Storage

Status: done

Deliverables:

- `monitor-collector` service
- Event ingestion endpoint
- PostgreSQL storage
- Event query endpoints
- Basic aggregation endpoints

Acceptance:

- SDK events are persisted.
- Events can be queried after service restart.
- Console can fetch overview and event lists.

## Stage 5: Monitoring Console

Status: done

Deliverables:

- `monitor-console` web app
- Overview view
- Performance view
- API view
- Stability view

Acceptance:

- Triggered events are visible in the console.
- API failures, JS errors, resource failures, and blank screens are distinguishable.
- Slow API and page performance data can be inspected.

## Stage 6: End-to-End Validation

Deliverables:

- Unified local startup scripts
- End-to-end validation checklist
- Basic test coverage for shared contracts and collector aggregation

Acceptance:

- One local run can exercise the full monitoring loop.
- Validation commands pass.
- Documentation matches the implemented behavior.
