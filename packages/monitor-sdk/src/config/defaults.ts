import {
  DEFAULT_APP_ID,
  DEFAULT_ENV,
  DEFAULT_RELEASE
} from "@mini-shop-monitor/shared";

export const SDK_VERSION = "0.1.0";
export const DEBUG_STORAGE_KEY = "__MINI_SHOP_MONITOR_EVENTS__";

export const DEFAULT_MONITOR_OPTIONS = {
  appId: DEFAULT_APP_ID,
  env: DEFAULT_ENV,
  release: DEFAULT_RELEASE,
  sampleRate: 1,
  debug: false,
  blankScreenSelectors: ["#shop-root", "#root"],
  allowUrls: [],
  denyUrls: [],
  flush: {
    strategy: "immediate",
    batchSize: 10,
    intervalMs: 5000
  }
} as const;
