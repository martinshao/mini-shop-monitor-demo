import type { MonitorEvent } from "@mini-shop-monitor/shared";

export type OverviewSummary = {
  totalEvents: number;
  errorEvents: number;
  performanceEvents: number;
};

export function createOverviewSummary(events: MonitorEvent[]): OverviewSummary {
  return {
    totalEvents: events.length,
    errorEvents: events.filter((event) => event.type.startsWith("error.")).length,
    performanceEvents: events.filter((event) =>
      event.type.startsWith("performance.")
    ).length
  };
}
