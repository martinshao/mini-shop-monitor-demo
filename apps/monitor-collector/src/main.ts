import type { MonitorEvent } from "@mini-shop-monitor/shared";

export type CollectorState = {
  events: MonitorEvent[];
};

export function createCollectorState(): CollectorState {
  return {
    events: []
  };
}

export function acceptMonitorEvent(state: CollectorState, event: MonitorEvent) {
  state.events.push(event);

  return {
    accepted: true,
    eventId: event.id
  };
}
