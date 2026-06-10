import type { MonitorEvent } from "@mini-shop-monitor/shared";
import type { ResolvedMonitorOptions } from "../config/options";
import { getErrorMessage } from "../utils/error";
import type { Transport } from "./transport";

export function createFetchTransport(
  options: ResolvedMonitorOptions,
  internalFetch: typeof fetch | null
): Transport {
  return {
    async send(event) {
      if (!internalFetch) {
        return;
      }

      try {
        await internalFetch(options.collectorUrl, {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify(event),
          keepalive: true
        });
      } catch (error) {
        if (options.debug) {
          console.warn("[monitor-sdk] report failed", getErrorMessage(error));
        }
      }
    },
    async flush(events: MonitorEvent[]) {
      await Promise.all(events.map((event) => this.send(event)));
    }
  };
}
