import type { MonitorEnvironment } from "@mini-shop-monitor/shared";
import { DEFAULT_MONITOR_OPTIONS } from "./defaults";

export type UrlPattern = string | RegExp;

export type FlushStrategy = {
  strategy?: "immediate" | "batch";
  batchSize?: number;
  intervalMs?: number;
};

export type MonitorInitOptions = {
  appId?: string;
  env?: MonitorEnvironment;
  release?: string;
  collectorUrl: string;
  sampleRate?: number;
  debug?: boolean;
  blankScreenSelectors?: string[];
  allowUrls?: UrlPattern[];
  denyUrls?: UrlPattern[];
  flush?: FlushStrategy;
};

export type ResolvedMonitorOptions = {
  appId: string;
  env: MonitorEnvironment;
  release: string;
  collectorUrl: string;
  sampleRate: number;
  debug: boolean;
  blankScreenSelectors: string[];
  allowUrls: UrlPattern[];
  denyUrls: UrlPattern[];
  flush: Required<FlushStrategy>;
};

export function resolveMonitorOptions(
  options: MonitorInitOptions
): ResolvedMonitorOptions {
  return {
    appId: options.appId ?? DEFAULT_MONITOR_OPTIONS.appId,
    env: options.env ?? DEFAULT_MONITOR_OPTIONS.env,
    release: options.release ?? DEFAULT_MONITOR_OPTIONS.release,
    collectorUrl: options.collectorUrl,
    sampleRate: options.sampleRate ?? DEFAULT_MONITOR_OPTIONS.sampleRate,
    debug: options.debug ?? DEFAULT_MONITOR_OPTIONS.debug,
    blankScreenSelectors:
      options.blankScreenSelectors ??
      [...DEFAULT_MONITOR_OPTIONS.blankScreenSelectors],
    allowUrls: options.allowUrls ?? [...DEFAULT_MONITOR_OPTIONS.allowUrls],
    denyUrls: options.denyUrls ?? [...DEFAULT_MONITOR_OPTIONS.denyUrls],
    flush: {
      strategy:
        options.flush?.strategy ?? DEFAULT_MONITOR_OPTIONS.flush.strategy,
      batchSize:
        options.flush?.batchSize ?? DEFAULT_MONITOR_OPTIONS.flush.batchSize,
      intervalMs:
        options.flush?.intervalMs ?? DEFAULT_MONITOR_OPTIONS.flush.intervalMs
    }
  };
}

export function shouldSample(sampleRate: number) {
  return sampleRate >= 1 || Math.random() <= sampleRate;
}

export function isUrlAllowed(
  url: string,
  allowUrls: UrlPattern[],
  denyUrls: UrlPattern[]
) {
  if (denyUrls.some((pattern) => matchesUrlPattern(url, pattern))) {
    return false;
  }

  if (allowUrls.length === 0) {
    return true;
  }

  return allowUrls.some((pattern) => matchesUrlPattern(url, pattern));
}

function matchesUrlPattern(url: string, pattern: UrlPattern) {
  return typeof pattern === "string" ? url.includes(pattern) : pattern.test(url);
}
