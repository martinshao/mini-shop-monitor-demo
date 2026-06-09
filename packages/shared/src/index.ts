export const MONITOR_EVENT_TYPES = {
  PERFORMANCE_PAGE: "performance.page",
  PERFORMANCE_API: "performance.api",
  PERFORMANCE_RESOURCE: "performance.resource",
  ERROR_JS: "error.js",
  ERROR_PROMISE: "error.promise",
  ERROR_API: "error.api",
  ERROR_RESOURCE: "error.resource",
  ERROR_BLANK_SCREEN: "error.blank_screen"
} as const;

export type MonitorEventType =
  (typeof MONITOR_EVENT_TYPES)[keyof typeof MONITOR_EVENT_TYPES];

export type MonitorEnvironment = "local" | "development" | "test" | "production";

export type MonitorEvent = {
  id: string;
  appId: string;
  env: MonitorEnvironment;
  release: string;
  type: MonitorEventType;
  pageUrl: string;
  timestamp: number;
  sdkVersion: string;
  traceId?: string;
  data: Record<string, unknown>;
};

export type MonitorEventPayload = Omit<MonitorEvent, "id" | "timestamp"> & {
  id?: string;
  timestamp?: number;
};

export const DEFAULT_APP_ID = "mini-shop-web";
export const DEFAULT_ENV: MonitorEnvironment = "local";
export const DEFAULT_RELEASE = "0.1.0";
