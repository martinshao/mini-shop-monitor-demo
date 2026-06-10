import type { ResolvedMonitorOptions } from "../config/options";
import type { Transport } from "./transport";

export function createBeaconTransport(
  options: ResolvedMonitorOptions,
  fallback: Transport
): Transport {
  return {
    async send(event) {
      // 预留 sendBeacon 传输层：适合页面卸载时尽量补发，当前主链路仍使用 fetch transport。
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.sendBeacon === "function"
      ) {
        const blob = new Blob([JSON.stringify(event)], {
          type: "application/json"
        });

        if (navigator.sendBeacon(options.collectorUrl, blob)) {
          return;
        }
      }

      await fallback.send(event);
    }
  };
}
