import {
  DEFAULT_APP_ID,
  DEFAULT_ENV,
  DEFAULT_RELEASE,
  type MonitorEnvironment,
  type MonitorEventPayload
} from "@mini-shop-monitor/shared";

export type MonitorInitOptions = {
  appId?: string;
  env?: MonitorEnvironment;
  release?: string;
  collectorUrl: string;
  sampleRate?: number;
  debug?: boolean;
};

let activeOptions: Required<MonitorInitOptions> | null = null;

export function initMonitor(options: MonitorInitOptions) {
  activeOptions = {
    appId: options.appId ?? DEFAULT_APP_ID,
    env: options.env ?? DEFAULT_ENV,
    release: options.release ?? DEFAULT_RELEASE,
    collectorUrl: options.collectorUrl,
    sampleRate: options.sampleRate ?? 1,
    debug: options.debug ?? false
  };

  return activeOptions;
}

export function getMonitorOptions() {
  return activeOptions;
}

export function createMonitorEventPayload(
  payload: Omit<MonitorEventPayload, "appId" | "env" | "release" | "sdkVersion">
): MonitorEventPayload {
  if (!activeOptions) {
    throw new Error("Monitor SDK must be initialized before creating events.");
  }

  return {
    ...payload,
    appId: activeOptions.appId,
    env: activeOptions.env,
    release: activeOptions.release,
    sdkVersion: "0.1.0"
  };
}
