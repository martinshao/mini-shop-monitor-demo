import type { MonitorEvent } from "@mini-shop-monitor/shared";
import type { ResolvedMonitorOptions } from "../config/options";
import type { Transport } from "./transport";

export function createBatchTransport(
  options: ResolvedMonitorOptions,
  delegate: Transport
): Transport {
  const queue: MonitorEvent[] = [];
  const batchSize = Math.max(1, options.flush.batchSize);
  let timerId: number | null = null;
  let idleId: number | null = null;
  let flushing = false;

  const scheduleFlush = () => {
    if (timerId !== null || idleId !== null) {
      return;
    }

    // 优先使用 requestIdleCallback，把网络 flush 放到浏览器空闲时执行，降低对交互的干扰。
    if (typeof window !== "undefined" && window.requestIdleCallback) {
      idleId = window.requestIdleCallback(
        () => {
          idleId = null;
          void flushQueuedEvents();
        },
        { timeout: options.flush.intervalMs }
      );

      return;
    }

    // 不支持 requestIdleCallback 时退化为 setTimeout，让 send(event) 本身保持轻量入队。
    timerId = window.setTimeout(() => {
      timerId = null;
      void flushQueuedEvents();
    }, options.flush.intervalMs);
  };

  const clearScheduledFlush = () => {
    if (timerId !== null) {
      window.clearTimeout(timerId);
      timerId = null;
    }

    if (idleId !== null && window.cancelIdleCallback) {
      window.cancelIdleCallback(idleId);
      idleId = null;
    }
  };

  const flushQueuedEvents = async () => {
    if (flushing || queue.length === 0) {
      return;
    }

    flushing = true;
    clearScheduledFlush();

    try {
      while (queue.length > 0) {
        const batch = queue.splice(0, batchSize);

        if (delegate.flush) {
          await delegate.flush(batch);
        } else {
          await Promise.all(batch.map((event) => delegate.send(event)));
        }
      }
    } finally {
      flushing = false;

      if (queue.length > 0) {
        scheduleFlush();
      }
    }
  };

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        void flushQueuedEvents();
      }
    });
  }

  if (typeof window !== "undefined") {
    window.addEventListener("pagehide", () => {
      void flushQueuedEvents();
    });
  }

  return {
    async send(event) {
      queue.push(event);

      if (queue.length >= batchSize) {
        // 达到批大小时也不在采集调用栈里 await，避免阻塞业务逻辑。
        queueMicrotask(() => {
          void flushQueuedEvents();
        });
        return;
      }

      scheduleFlush();
    },
    async flush(events = []) {
      if (events.length > 0) {
        queue.push(...events);
      }

      await flushQueuedEvents();
    }
  };
}
