import type { MonitorEvent } from "@mini-shop-monitor/shared";

export type Transport = {
  send(event: MonitorEvent): Promise<void>;
  flush?(events: MonitorEvent[]): Promise<void>;
};
