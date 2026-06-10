import type { MonitorEvent, MonitorEventType } from "@mini-shop-monitor/shared";

export type MonitorEventWithCreatedAt = MonitorEvent & {
  createdAt: string;
};

export type OverviewResponse = {
  totalEvents: number;
  errorEvents: number;
  apiFailures: number;
  resourceFailures: number;
  blankScreens: number;
  avgLcp: number | null;
  avgApiDuration: number | null;
};

export type PerformanceGroup = {
  type: MonitorEventType;
  eventCount: number;
  avgDuration: number | null;
  avgLcp: number | null;
  avgFcp: number | null;
  avgCls: number | null;
};

export type ErrorGroup = {
  type: MonitorEventType;
  eventCount: number;
  latestAt: string;
};

export type ApiGroup = {
  url: string | null;
  method: string | null;
  requestCount: number;
  avgDuration: number | null;
  p95Duration: number | null;
  failureCount: number;
  failureRate: number;
};

export type ConsoleData = {
  overview: OverviewResponse;
  events: MonitorEventWithCreatedAt[];
  performance: PerformanceGroup[];
  errors: ErrorGroup[];
  apis: ApiGroup[];
};

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Request ${path} failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function getConsoleData(): Promise<ConsoleData> {
  const [overview, eventsResponse, performanceResponse, errorsResponse, apisResponse] =
    await Promise.all([
      getJson<OverviewResponse>("/api/overview"),
      getJson<{ events: MonitorEventWithCreatedAt[] }>("/api/events?limit=80"),
      getJson<{ groups: PerformanceGroup[] }>("/api/performance"),
      getJson<{ groups: ErrorGroup[] }>("/api/errors"),
      getJson<{ apis: ApiGroup[] }>("/api/apis")
    ]);

  return {
    overview,
    events: eventsResponse.events,
    performance: performanceResponse.groups,
    errors: errorsResponse.groups,
    apis: apisResponse.apis
  };
}
