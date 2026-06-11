import {
  DEFAULT_APP_ID,
  DEFAULT_ENV,
  DEFAULT_RELEASE
} from "@mini-shop-monitor/shared";

export const SDK_VERSION = "0.1.0";
export const DEBUG_STORAGE_KEY = "__MINI_SHOP_MONITOR_EVENTS__";

// 默认配置集中在 Config 层，保证 Core 初始化逻辑不散落默认值。
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
    // 默认使用批量上报，减少频繁网络请求；仍可通过配置切回 immediate。
    strategy: "batch",
    batchSize: 10,
    intervalMs: 3000
  }
} as const;
