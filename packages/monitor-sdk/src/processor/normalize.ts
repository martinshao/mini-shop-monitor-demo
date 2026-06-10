import type { RawMonitorRecord } from "./event-processor";

export function normalizeRawRecord(record: RawMonitorRecord): RawMonitorRecord {
  return {
    ...record,
    timestamp: record.timestamp ?? Date.now(),
    data: record.data ?? {}
  };
}
