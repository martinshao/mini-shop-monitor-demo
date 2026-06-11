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
      await postPayload(event, options, internalFetch);
    },
    async flush(events: MonitorEvent[] = []) {
      if (events.length === 0) {
        return;
      }

      // collector 支持数组入库，批量 flush 时只发一次请求，降低网络和主线程调度压力。
      await postPayload(events, options, internalFetch);
    }
  };
}

async function postPayload(
  payload: MonitorEvent | MonitorEvent[],
  options: ResolvedMonitorOptions,
  internalFetch: typeof fetch | null
) {
  if (!internalFetch) {
    return;
  }

  try {
    await internalFetch(options.collectorUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(payload),
      keepalive: true
    });
  } catch (error) {
    // 监控上报失败不能影响业务页面，只在 debug 模式输出诊断信息。
    if (options.debug) {
      console.warn("[monitor-sdk] report failed", getErrorMessage(error));
    }
  }
}
