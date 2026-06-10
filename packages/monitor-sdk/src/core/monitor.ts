import type {
  MonitorEvent,
  MonitorEventPayload,
  MonitorEventType
} from "@mini-shop-monitor/shared";
import { createNoopChannel } from "../channel/noop-channel";
import { createCollectors } from "../collectors";
import type { BlankScreenCollector } from "../collectors/blank-screen";
import { resolveMonitorOptions, shouldSample } from "../config/options";
import type {
  MonitorInitOptions,
  ResolvedMonitorOptions
} from "../config/options";
import { createEventProcessor, type EventProcessor } from "../processor/event-processor";
import { createMemoryStorage } from "../storage/memory-storage";
import { getDebugStorageKey, syncDebugStorage } from "../storage/debug-storage";
import type { EventStorage } from "../storage/event-storage";
import { createFetchTransport } from "../transport/fetch-transport";
import type { Transport } from "../transport/transport";
import { isBrowser } from "../utils/browser";
import { isInstalled, markInstalled } from "./lifecycle";

export type MonitorRuntime = {
  options: ResolvedMonitorOptions;
  storage: EventStorage;
  transport: Transport;
  processor: EventProcessor;
  blankScreenCollector: BlankScreenCollector | null;
};

let runtime: MonitorRuntime | null = null;

declare global {
  interface Window {
    __MONITOR_DEBUG__?: {
      getBufferedEvents: typeof getBufferedEvents;
      clearBufferedEvents: typeof clearBufferedEvents;
      checkBlankScreen: typeof checkBlankScreen;
    };
  }
}

export function initMonitor(options: MonitorInitOptions) {
  const resolvedOptions = resolveMonitorOptions(options);
  const internalFetch = isBrowser() ? window.fetch.bind(window) : null;
  const storage = runtime?.storage ?? createMemoryStorage();
  const processor = createEventProcessor(resolvedOptions);
  const transport = createFetchTransport(resolvedOptions, internalFetch);
  const { collectors, blankScreenCollector } = createCollectors();

  runtime = {
    options: resolvedOptions,
    storage,
    transport,
    processor,
    blankScreenCollector
  };

  if (!isInstalled() && isBrowser()) {
    markInstalled();
    collectors.forEach((collector) => {
      collector.install({
        options: resolvedOptions,
        internalFetch,
        capture(record) {
          captureRawRecord(record);
        }
      });
    });
  }

  if (resolvedOptions.debug && isBrowser()) {
    window.__MONITOR_DEBUG__ = {
      getBufferedEvents,
      clearBufferedEvents,
      checkBlankScreen
    };
  }

  createNoopChannel().publish({ type: "monitor:init" });

  return resolvedOptions;
}

export function getMonitorOptions() {
  return runtime?.options ?? null;
}

export function getBufferedEvents() {
  return runtime?.storage.getAll() ?? [];
}

export function clearBufferedEvents() {
  runtime?.storage.clear();

  if (runtime?.options.debug && isBrowser()) {
    syncDebugStorage(runtime.storage);
  }
}

export function createMonitorEventPayload(
  payload: Omit<MonitorEventPayload, "appId" | "env" | "release" | "sdkVersion">
): MonitorEventPayload {
  return requireRuntime().processor.createPayload(payload);
}

export function sendEvent(payload: MonitorEventPayload) {
  const currentRuntime = requireRuntime();
  const event = currentRuntime.processor.fromPayload(payload);

  persistAndSend(event, currentRuntime);
}

export function reportCustomEvent(
  type: MonitorEventType,
  data: Record<string, unknown>,
  pageUrl?: string
) {
  const currentRuntime = requireRuntime();

  sendEvent(
    currentRuntime.processor.createPayload({
      type,
      pageUrl: pageUrl ?? (isBrowser() ? window.location.href : ""),
      data
    })
  );
}

export function checkBlankScreen() {
  return runtime?.blankScreenCollector?.check() ?? false;
}

export { getDebugStorageKey };
export type { MonitorInitOptions, ResolvedMonitorOptions };

function captureRawRecord(
  record: Parameters<EventProcessor["fromRaw"]>[0]
) {
  const currentRuntime = requireRuntime();
  const event = currentRuntime.processor.fromRaw(record);

  persistAndSend(event, currentRuntime);
}

function persistAndSend(event: MonitorEvent, currentRuntime: MonitorRuntime) {
  if (!shouldSample(currentRuntime.options.sampleRate)) {
    return;
  }

  currentRuntime.storage.add(event);

  if (currentRuntime.options.debug && isBrowser()) {
    syncDebugStorage(currentRuntime.storage);
    console.info("[monitor-sdk]", event.type, event);
  }

  void currentRuntime.transport.send(event);
}

function requireRuntime() {
  if (!runtime) {
    throw new Error("Monitor SDK must be initialized before creating events.");
  }

  return runtime;
}
