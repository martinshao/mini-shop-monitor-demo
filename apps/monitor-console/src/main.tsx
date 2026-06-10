import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import type { MonitorEventType } from "@mini-shop-monitor/shared";
import {
  getConsoleData,
  type ApiGroup,
  type ConsoleData,
  type ErrorGroup,
  type MonitorEventWithCreatedAt,
  type OverviewResponse,
  type PerformanceGroup
} from "./api";
import "./styles.css";

type ViewKey = "overview" | "performance" | "api" | "stability";

const views: Array<{ key: ViewKey; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "performance", label: "Performance" },
  { key: "api", label: "API" },
  { key: "stability", label: "Stability" }
];

function App() {
  const [view, setView] = useState<ViewKey>("overview");
  const [data, setData] = useState<ConsoleData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    setLoading(true);
    setError(null);

    getConsoleData()
      .then(setData)
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : String(reason))
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Mini Shop</p>
          <h1>Monitor Console</h1>
        </div>

        <nav className="view-tabs" aria-label="Console views">
          {views.map((item) => (
            <button
              className={item.key === view ? "active" : ""}
              key={item.key}
              type="button"
              onClick={() => setView(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="content">
        <header className="content-header">
          <div>
            <p className="eyebrow">Local collector</p>
            <h2>{views.find((item) => item.key === view)?.label}</h2>
          </div>
          <button type="button" onClick={refresh}>
            Refresh
          </button>
        </header>

        {loading && <StatePanel label="Loading monitoring data..." />}
        {error && <StatePanel tone="error" label={error} />}
        {!loading && !error && data && (
          <>
            {view === "overview" && <OverviewView data={data} />}
            {view === "performance" && (
              <PerformanceView groups={data.performance} events={data.events} />
            )}
            {view === "api" && <ApiView apis={data.apis} events={data.events} />}
            {view === "stability" && (
              <StabilityView groups={data.errors} events={data.events} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

function OverviewView({ data }: { data: ConsoleData }) {
  const recentErrors = useMemo(
    () => data.events.filter((event) => event.type.startsWith("error.")).slice(0, 6),
    [data.events]
  );

  return (
    <div className="view-stack">
      <MetricGrid overview={data.overview} />

      <section className="panel">
        <PanelTitle title="Recent Events" subtitle="Newest monitoring records from PostgreSQL" />
        <EventTable events={data.events.slice(0, 10)} />
      </section>

      <section className="panel">
        <PanelTitle title="Recent Stability Signals" subtitle="Errors that need inspection first" />
        {recentErrors.length > 0 ? (
          <EventTable events={recentErrors} />
        ) : (
          <EmptyState label="No error events yet." />
        )}
      </section>
    </div>
  );
}

function MetricGrid({ overview }: { overview: OverviewResponse }) {
  const metrics = [
    { label: "Total Events", value: overview.totalEvents },
    { label: "Errors", value: overview.errorEvents },
    { label: "API Failures", value: overview.apiFailures },
    { label: "Resource Failures", value: overview.resourceFailures },
    { label: "Blank Screens", value: overview.blankScreens },
    { label: "Avg LCP", value: formatMs(overview.avgLcp) },
    { label: "Avg API", value: formatMs(overview.avgApiDuration) }
  ];

  return (
    <section className="metric-grid">
      {metrics.map((metric) => (
        <article className="metric-card" key={metric.label}>
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
        </article>
      ))}
    </section>
  );
}

function PerformanceView({
  groups,
  events
}: {
  groups: PerformanceGroup[];
  events: MonitorEventWithCreatedAt[];
}) {
  const performanceEvents = events.filter((event) =>
    event.type.startsWith("performance.")
  );

  return (
    <div className="view-stack">
      <section className="panel">
        <PanelTitle title="Performance Groups" subtitle="Page, API, and resource aggregates" />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Events</th>
                <th>Avg Duration</th>
                <th>Avg LCP</th>
                <th>Avg FCP</th>
                <th>Avg CLS</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <tr key={group.type}>
                  <td>{group.type}</td>
                  <td>{group.eventCount}</td>
                  <td>{formatMs(group.avgDuration)}</td>
                  <td>{formatMs(group.avgLcp)}</td>
                  <td>{formatMs(group.avgFcp)}</td>
                  <td>{formatValue(group.avgCls)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <PanelTitle title="Performance Events" subtitle="Latest raw performance records" />
        <EventTable events={performanceEvents.slice(0, 20)} />
      </section>
    </div>
  );
}

function ApiView({
  apis,
  events
}: {
  apis: ApiGroup[];
  events: MonitorEventWithCreatedAt[];
}) {
  const apiEvents = events.filter((event) =>
    ["performance.api", "error.api"].includes(event.type)
  );

  return (
    <div className="view-stack">
      <section className="panel">
        <PanelTitle title="API Aggregates" subtitle="Duration and failure statistics by endpoint" />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Method</th>
                <th>URL</th>
                <th>Requests</th>
                <th>Avg</th>
                <th>P95</th>
                <th>Failures</th>
                <th>Failure Rate</th>
              </tr>
            </thead>
            <tbody>
              {apis.map((api) => (
                <tr key={`${api.method}-${api.url}`}>
                  <td>{api.method ?? "UNKNOWN"}</td>
                  <td>{api.url ?? "unknown"}</td>
                  <td>{api.requestCount}</td>
                  <td>{formatMs(api.avgDuration)}</td>
                  <td>{formatMs(api.p95Duration)}</td>
                  <td>{api.failureCount}</td>
                  <td>{formatPercent(api.failureRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <PanelTitle title="API Events" subtitle="Latest API performance and failure records" />
        <EventTable events={apiEvents.slice(0, 20)} />
      </section>
    </div>
  );
}

function StabilityView({
  groups,
  events
}: {
  groups: ErrorGroup[];
  events: MonitorEventWithCreatedAt[];
}) {
  const errorEvents = events.filter((event) => event.type.startsWith("error."));

  return (
    <div className="view-stack">
      <section className="panel">
        <PanelTitle title="Error Groups" subtitle="Stability signals grouped by event type" />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Events</th>
                <th>Latest</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <tr key={group.type}>
                  <td>{group.type}</td>
                  <td>{group.eventCount}</td>
                  <td>{formatDate(group.latestAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <PanelTitle title="Error Details" subtitle="Raw JS, Promise, API, resource, and blank-screen events" />
        <EventTable events={errorEvents.slice(0, 30)} />
      </section>
    </div>
  );
}

function EventTable({ events }: { events: MonitorEventWithCreatedAt[] }) {
  if (events.length === 0) {
    return <EmptyState label="No events matched this view." />;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Page</th>
            <th>Time</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id}>
              <td>
                <EventBadge type={event.type} />
              </td>
              <td>{shortUrl(event.pageUrl)}</td>
              <td>{formatDate(event.createdAt)}</td>
              <td>
                <code>{summarizeData(event.data)}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EventBadge({ type }: { type: MonitorEventType }) {
  const tone = type.startsWith("error.") ? "danger" : "info";

  return <span className={`badge ${tone}`}>{type}</span>;
}

function PanelTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="panel-title">
      <h3>{title}</h3>
      <p>{subtitle}</p>
    </div>
  );
}

function StatePanel({ label, tone }: { label: string; tone?: "error" }) {
  return <div className={`state-panel ${tone === "error" ? "error" : ""}`}>{label}</div>;
}

function EmptyState({ label }: { label: string }) {
  return <div className="empty-state">{label}</div>;
}

function summarizeData(data: Record<string, unknown>) {
  const entries = Object.entries(data).slice(0, 4);

  if (entries.length === 0) {
    return "{}";
  }

  return entries
    .map(([key, value]) => `${key}: ${formatDataValue(value)}`)
    .join(", ");
}

function formatDataValue(value: unknown) {
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (typeof value === "string") {
    return value.length > 48 ? `${value.slice(0, 45)}...` : value;
  }

  return JSON.stringify(value);
}

function formatMs(value: number | null) {
  return value == null || Number.isNaN(value) ? "-" : `${value.toFixed(2)} ms`;
}

function formatValue(value: number | null) {
  return value == null || Number.isNaN(value) ? "-" : String(value);
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value));
}

function shortUrl(value: string) {
  try {
    const url = new URL(value);
    return `${url.pathname}${url.search}`;
  } catch {
    return value;
  }
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
