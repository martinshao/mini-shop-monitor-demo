import type {
  MonitorEvent,
  MonitorEventPayload,
  MonitorEventType
} from "@mini-shop-monitor/shared";
import { createNoopChannel } from "../channel/noop-channel";
import { createCollectors } from "../collectors";
import type { BlankScreenCollector } from "../collectors/blank-screen";
import { resolveMonitorOptions, shouldSample } from "../config/options";
import type {
  MonitorInitOptions,
  ResolvedMonitorOptions
} from "../config/options";
import { createEventProcessor, type EventProcessor } from "../processor/event-processor";
import { createMemoryStorage } from "../storage/memory-storage";
import { getDebugStorageKey, syncDebugStorage } from "../storage/debug-storage";
import type { EventStorage } from "../storage/event-storage";
import { createFetchTransport } from "../transport/fetch-transport";
import type { Transport } from "../transport/transport";
import { isBrowser } from "../utils/browser";
import { isInstalled, markInstalled } from "./lifecycle";

export type MonitorRuntime = {
  // SDK 运行期上下文：Core 层负责把配置、采集、处理、存储、传输组装到一起。
  options: ResolvedMonitorOptions;
  storage: EventStorage;
  transport: Transport;
  processor: EventProcessor;
  blankScreenCollector: BlankScreenCollector | null;
};

let runtime: MonitorRuntime | null = null;

declare global {
  interface Window {
    __MONITOR_DEBUG__?: {
      getBufferedEvents: typeof getBufferedEvents;
      clearBufferedEvents: typeof clearBufferedEvents;
      checkBlankScreen: typeof checkBlankScreen;
    };
  }
}

export function initMonitor(options: MonitorInitOptions) {
  // 初始化只做编排：合并配置、创建运行时依赖、安装采集器，不在这里写具体采集逻辑。
  const resolvedOptions = resolveMonitorOptions(options);
  const internalFetch = isBrowser() ? window.fetch.bind(window) : null;
  const storage = runtime?.storage ?? createMemoryStorage();
  const processor = createEventProcessor(resolvedOptions);
  const transport = createFetchTransport(resolvedOptions, internalFetch);
  const { collectors, blankScreenCollector } = createCollectors();

  runtime = {
    options: resolvedOptions,
    storage,
    transport,
    processor,
    blankScreenCollector
  };

  if (!isInstalled() && isBrowser()) {
    // 采集器只能安装一次，避免 React 严格模式或重复 init 导致 fetch/error 监听被重复代理。
    markInstalled();
    collectors.forEach((collector) => {
      collector.install({
        options: resolvedOptions,
        internalFetch,
        capture(record) {
          captureRawRecord(record);
        }
      });
    });
  }

  if (resolvedOptions.debug && isBrowser()) {
    // debug 入口仅在调试模式暴露，方便本地验证 SDK buffer 和白屏检测。
    window.__MONITOR_DEBUG__ = {
      getBufferedEvents,
      clearBufferedEvents,
      checkBlankScreen
    };
  }

  createNoopChannel().publish({ type: "monitor:init" });

  return resolvedOptions;
}

export function getMonitorOptions() {
  return runtime?.options ?? null;
}

export function getBufferedEvents() {
  return runtime?.storage.getAll() ?? [];
}

export function clearBufferedEvents() {
  runtime?.storage.clear();

  if (runtime?.options.debug && isBrowser()) {
    syncDebugStorage(runtime.storage);
  }
}

export function createMonitorEventPayload(
  payload: Omit<MonitorEventPayload, "appId" | "env" | "release" | "sdkVersion">
): MonitorEventPayload {
  return requireRuntime().processor.createPayload(payload);
}

export function sendEvent(payload: MonitorEventPayload) {
  const currentRuntime = requireRuntime();
  // 外部手动上报的 payload 也统一走 Processor，保证事件模型和脱敏规则一致。
  const event = currentRuntime.processor.fromPayload(payload);

  persistAndSend(event, currentRuntime);
}

export function reportCustomEvent(
  type: MonitorEventType,
  data: Record<string, unknown>,
  pageUrl?: string
) {
  const currentRuntime = requireRuntime();

  sendEvent(
    currentRuntime.processor.createPayload({
      type,
      pageUrl: pageUrl ?? (isBrowser() ? window.location.href : ""),
      data
    })
  );
}

export function checkBlankScreen() {
  return runtime?.blankScreenCollector?.check() ?? false;
}

export { getDebugStorageKey };
export type { MonitorInitOptions, ResolvedMonitorOptions };

function captureRawRecord(
  record: Parameters<EventProcessor["fromRaw"]>[0]
) {
  const currentRuntime = requireRuntime();
  // Collector 只产出 raw record，标准事件类型映射和字段补齐都集中交给 Processor。
  const event = currentRuntime.processor.fromRaw(record);

  persistAndSend(event, currentRuntime);
}

function persistAndSend(event: MonitorEvent, currentRuntime: MonitorRuntime) {
  // 采样在进入存储和发送前执行，避免未采样事件污染本地队列和 debug 状态。
  if (!shouldSample(currentRuntime.options.sampleRate)) {
    return;
  }

  currentRuntime.storage.add(event);

  if (currentRuntime.options.debug && isBrowser()) {
    // debug 状态写入 localStorage 和 dataset，便于人工调试和浏览器自动化验证。
    syncDebugStorage(currentRuntime.storage);
    console.info("[monitor-sdk]", event.type, event);
  }

  // 发送失败不能影响宿主页面，因此 Transport 内部自行吞掉网络错误并输出 debug warn。
  void currentRuntime.transport.send(event);
}

function requireRuntime() {
  if (!runtime) {
    throw new Error("Monitor SDK must be initialized before creating events.");
  }

  return runtime;
}
