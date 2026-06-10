import type { ResolvedMonitorOptions } from "../config/options";
import type { RawMonitorRecord } from "../processor/event-processor";

export type CollectorContext = {
  options: ResolvedMonitorOptions;
  capture: (record: RawMonitorRecord) => void;
  internalFetch: typeof fetch | null;
};

export type Collector = {
  name: string;
  install(context: CollectorContext): void;
};
