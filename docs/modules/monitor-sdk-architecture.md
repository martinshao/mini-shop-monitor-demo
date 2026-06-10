# Monitor SDK Architecture

The SDK is organized as layered modules. The first refactor keeps runtime behavior equivalent while giving each responsibility a stable place to evolve.

## Layers

```txt
Core
  -> Config
  -> Collectors
  -> Processor
  -> Storage
  -> Transport
  -> Channel
```

## Core

Files:

- `packages/monitor-sdk/src/core/monitor.ts`
- `packages/monitor-sdk/src/core/lifecycle.ts`

Responsibilities:

- Initialize the SDK.
- Resolve and hold runtime dependencies.
- Prevent duplicate collector installation.
- Expose public APIs such as `initMonitor`, `sendEvent`, and `checkBlankScreen`.

## Config

Files:

- `packages/monitor-sdk/src/config/defaults.ts`
- `packages/monitor-sdk/src/config/options.ts`

Responsibilities:

- Define defaults.
- Merge user options.
- Hold sampling, URL allow/deny lists, blank screen selectors, and flush strategy placeholders.

## Collectors

Files:

- `collectors/page-load.ts`
- `collectors/api.ts`
- `collectors/resource.ts`
- `collectors/error.ts`
- `collectors/blank-screen.ts`

Responsibilities:

- Listen to browser signals.
- Capture raw records only.
- Avoid constructing final monitor events directly.

## Processor

Files:

- `processor/event-processor.ts`
- `processor/normalize.ts`
- `processor/sanitize.ts`

Responsibilities:

- Map raw records to event types.
- Sanitize sensitive data.
- Construct the standard `MonitorEvent` model.

## Storage

Files:

- `storage/event-storage.ts`
- `storage/memory-storage.ts`
- `storage/debug-storage.ts`

Responsibilities:

- Store in-memory event buffers.
- Expose debug event data through localStorage and `documentElement.dataset`.
- Leave room for IndexedDB storage later.

## Transport

Files:

- `transport/transport.ts`
- `transport/fetch-transport.ts`
- `transport/beacon-transport.ts`

Responsibilities:

- Send events to the collector.
- Keep internal sender behavior separate from API collection.
- Leave room for batch flush, retry, and sendBeacon strategy later.

## Channel

Files:

- `channel/channel.ts`
- `channel/noop-channel.ts`

Responsibilities:

- Reserve a cross-tab coordination boundary.
- Keep current runtime behavior unchanged until BroadcastChannel support is needed.

## Event Flow

```txt
Collector captures raw record
  -> Core capture()
  -> Processor creates MonitorEvent
  -> Storage stores event
  -> Debug storage updates local state
  -> Transport sends event
```

## Current Non-Goals

- IndexedDB queue
- Batch flush
- Retry backoff
- BroadcastChannel leader election
- Sourcemap parsing
- Breadcrumbs
