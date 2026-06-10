import type { ResolvedMonitorOptions } from "../config/options";
import type { Transport } from "./transport";

export function createBeaconTransport(
  options: ResolvedMonitorOptions,
  fallback: Transport
): Transport {
  return {
    async send(event) {
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
