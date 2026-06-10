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
      // 使用原始 fetch 发送，避免被 API Collector 代理后的 window.fetch 再次采集。
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
        // 监控上报失败不能影响业务页面，只在 debug 模式输出诊断信息。
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
