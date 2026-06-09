# Project Design

## Positioning

Mini Shop Monitor Demo is a monorepo-based frontend monitoring validation sandbox.

It uses a lightweight C-side shop interface to simulate performance and stability issues that commonly happen in real user traffic. The real product being validated is the monitoring system, not the shop.

## Core Objective

The project validates four capabilities:

```txt
1. The C-side page can trigger realistic performance and stability scenarios.
2. The monitoring SDK can collect the relevant data.
3. The collector can receive, validate, and store events.
4. The console can display the events in a way that supports diagnosis.
```

## System Flow

```txt
shop-web
  -> monitor-sdk
  -> monitor-collector
  -> local storage
  -> monitor-console
```

## First-Phase Scope

Performance monitoring:

- First screen performance
- Product list loading
- Image resource loading
- API duration

Stability monitoring:

- JS Error
- Promise Error
- API failure
- Resource loading failure
- Blank screen

## Explicit Non-Goals

The first phase does not include:

- Full ecommerce business flows
- Cart and checkout
- Payment simulation
- User behavior chains
- Session replay
- Complex breadcrumbs
- Alerting
- Sourcemap parsing
- Multi-environment delivery

## Design Principles

- Keep business light.
- Keep scenarios realistic.
- Keep failures controllable.
- Keep metrics focused.
- Keep the loop end to end.
- Keep modules independently extensible.
