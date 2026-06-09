import { DEFAULT_APP_ID } from "@mini-shop-monitor/shared";
import { initMonitor } from "@mini-shop-monitor/monitor-sdk";

export function bootstrapShopWeb() {
  initMonitor({
    appId: DEFAULT_APP_ID,
    env: "local",
    release: "0.1.0",
    collectorUrl: "http://localhost:4000/api/events"
  });

  return {
    appName: "shop-web",
    purpose: "C-side shop sandbox for frontend monitoring validation"
  };
}
