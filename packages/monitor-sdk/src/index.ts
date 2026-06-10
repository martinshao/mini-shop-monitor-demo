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
