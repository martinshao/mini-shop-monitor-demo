// SDK 对外入口只做导出，内部实现按 Core/Config/Collectors/Processor/Storage/Transport/Channel 分层。
export {
  checkBlankScreen,
  clearBufferedEvents,
  createMonitorEventPayload,
  getBufferedEvents,
  getDebugStorageKey,
  getMonitorOptions,
  initMonitor,
  reportCustomEvent,
  sendEvent
} from "./core/monitor";

export type {
  MonitorInitOptions,
  ResolvedMonitorOptions
} from "./core/monitor";
