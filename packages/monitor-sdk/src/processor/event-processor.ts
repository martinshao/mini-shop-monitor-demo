import {
  MONITOR_EVENT_TYPES,
  type MonitorEvent,
  type MonitorEventPayload,
  type MonitorEventType
} from "@mini-shop-monitor/shared";
import { SDK_VERSION } from "../config/defaults";
import type { ResolvedMonitorOptions } from "../config/options";
import { createEventId } from "../utils/id";
import { getPageUrl } from "../utils/url";
import { sanitizeData } from "./sanitize";

export type RawMonitorKind =
  | "page-load"
  | "longtask"
  | "api"
  | "resource-performance"
  | "resource-error"
  | "js-error"
  | "promise-error"
  | "blank-screen";

export type RawMonitorRecord = {
  kind: RawMonitorKind;
  pageUrl?: string;
  timestamp?: number;
  data: Record<string, unknown>;
};

export type EventProcessor = {
  fromRaw(record: RawMonitorRecord): MonitorEvent;
  fromPayload(payload: MonitorEventPayload): MonitorEvent;
  createPayload(
    payload: Omit<
      MonitorEventPayload,
      "appId" | "env" | "release" | "sdkVersion"
    >
  ): MonitorEventPayload;
};

export function createEventProcessor(
  options: ResolvedMonitorOptions
): EventProcessor {
  // Processor 是 raw record 到标准 MonitorEvent 的唯一入口，统一做类型映射、字段补齐和脱敏。
  return {
    fromRaw(record) {
      return createEventFromPayload(options, {
        type: mapRawKindToEventType(record.kind, record.data),
        pageUrl: record.pageUrl ?? getPageUrl(),
        timestamp: record.timestamp,
        data: sanitizeData(record.data)
      });
    },
    fromPayload(payload) {
      return createEventFromPayload(options, {
        ...payload,
        data: sanitizeData(payload.data)
      });
    },
    createPayload(payload) {
      return {
        ...payload,
        appId: options.appId,
        env: options.env,
        release: options.release,
        sdkVersion: SDK_VERSION,
        data: sanitizeData(payload.data)
      };
    }
  };
}

function createEventFromPayload(
  options: ResolvedMonitorOptions,
  payload: Partial<MonitorEventPayload> & {
    type: MonitorEventType;
    pageUrl: string;
    data: Record<string, unknown>;
  }
): MonitorEvent {
  // 标准事件模型在这里收口，确保 collector/console 看到的字段结构稳定。
  return {
    id: payload.id ?? createEventId(),
    appId: payload.appId ?? options.appId,
    env: payload.env ?? options.env,
    release: payload.release ?? options.release,
    type: payload.type,
    pageUrl: payload.pageUrl,
    timestamp: payload.timestamp ?? Date.now(),
    sdkVersion: payload.sdkVersion ?? SDK_VERSION,
    traceId: payload.traceId,
    data: payload.data
  };
}

function mapRawKindToEventType(
  kind: RawMonitorKind,
  data: Record<string, unknown>
): MonitorEventType {
  if (kind === "api") {
    // API 原始记录通过 ok 字段派生性能事件或错误事件。
    return data.ok === false
      ? MONITOR_EVENT_TYPES.ERROR_API
      : MONITOR_EVENT_TYPES.PERFORMANCE_API;
  }

  const map: Record<Exclude<RawMonitorKind, "api">, MonitorEventType> = {
    "page-load": MONITOR_EVENT_TYPES.PERFORMANCE_PAGE,
    longtask: MONITOR_EVENT_TYPES.PERFORMANCE_PAGE,
    "resource-performance": MONITOR_EVENT_TYPES.PERFORMANCE_RESOURCE,
    "resource-error": MONITOR_EVENT_TYPES.ERROR_RESOURCE,
    "js-error": MONITOR_EVENT_TYPES.ERROR_JS,
    "promise-error": MONITOR_EVENT_TYPES.ERROR_PROMISE,
    "blank-screen": MONITOR_EVENT_TYPES.ERROR_BLANK_SCREEN
  };

  return map[kind];
}
