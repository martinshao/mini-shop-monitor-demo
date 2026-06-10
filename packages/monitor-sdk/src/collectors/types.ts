import type { ResolvedMonitorOptions } from "../config/options";
import type { RawMonitorRecord } from "../processor/event-processor";

export type CollectorContext = {
  // Collector 只能通过 capture 输出 RawMonitorRecord，不能直接创建或发送标准事件。
  options: ResolvedMonitorOptions;
  capture: (record: RawMonitorRecord) => void;
  // 原始 fetch 由 Core 注入，供 API Collector 和 Transport 避免递归代理。
  internalFetch: typeof fetch | null;
};

export type Collector = {
  name: string;
  // install 只负责注册浏览器监听或代理，不返回业务数据。
  install(context: CollectorContext): void;
};
