# Module Design

## apps/shop-web

Role:

```txt
The monitored C-side shop sandbox.
```

Responsibilities:

- Render the first-phase shop pages.
- Trigger realistic performance and stability scenarios.
- Initialize `monitor-sdk`.
- Call the NestJS shop API for PostgreSQL-backed product data and controllable fault scenarios.

Planned pages:

- `/`
- `/products`
- `/products/:id`
- `/lab`

## apps/mock-api

Role:

```txt
The NestJS business API for the shop experiment surface.
```

Responsibilities:

- Read product data from local PostgreSQL.
- Create the `shop_products` table and seed default local products when needed.
- Provide home, product list, and product detail data.
- Provide controllable slow responses.
- Provide controllable 4xx and 5xx responses.
- Provide malformed data and large lists for SDK validation.

## apps/monitor-collector

Role:

```txt
The monitoring ingestion service.
```

Responsibilities:

- Receive SDK events.
- Validate the basic event shape.
- Classify event types.
- Store events in local PostgreSQL.
- Provide query endpoints for the console.

First planned endpoints:

- `POST /api/events`
- `GET /api/events`
- `GET /api/overview`
- `GET /api/performance`
- `GET /api/errors`
- `GET /api/apis`

## apps/monitor-console

Role:

```txt
The monitoring data visibility layer.
```

Responsibilities:

- Show event totals and health overview.
- Show performance records.
- Show API duration and failure statistics.
- Show stability events and details.

First planned views:

- Overview
- Performance
- API
- Stability

Default local URL:

- `http://localhost:3200`

## packages/monitor-sdk

Role:

```txt
The frontend monitoring collection layer.
```

Responsibilities:

- Initialize monitoring config.
- Collect page performance.
- Collect API duration and API failure.
- Collect JS Error and Promise Error.
- Collect resource loading failures.
- Detect blank screens.
- Report events to the collector.

Internal architecture:

- Core
- Config
- Collectors
- Processor
- Storage
- Transport
- Channel

Detailed reference:

- `docs/modules/monitor-sdk-architecture.md`

## packages/shared

Role:

```txt
The shared contract package.
```

Responsibilities:

- Define monitor event types.
- Define monitor event payloads.
- Define shared constants.
- Keep SDK, collector, and console aligned on the same protocol.
