import cors from "@fastify/cors";
import Fastify from "fastify";
import pg from "pg";
import {
  MONITOR_EVENT_TYPES,
  type MonitorEvent,
  type MonitorEventType
} from "@mini-shop-monitor/shared";

const { Pool } = pg;

const DEFAULT_PORT = 4000;
const DEFAULT_DATABASE_URL =
  "postgres://dev:dev123456@localhost:5432/app_dev";

type DbRow = {
  id: string;
  app_id: string;
  env: string;
  release: string;
  type: MonitorEventType;
  page_url: string;
  timestamp_ms: string;
  sdk_version: string;
  trace_id: string | null;
  data: Record<string, unknown>;
  created_at: Date;
};

type EventQuery = {
  type?: MonitorEventType;
  appId?: string;
  pageUrl?: string;
  limit?: string;
  offset?: string;
};

type ApiAggregateRow = {
  url: string | null;
  method: string | null;
  request_count: string;
  avg_duration: string | null;
  p95_duration: string | null;
  failure_count: string;
  failure_rate: string;
};

type PerformanceRow = {
  type: MonitorEventType;
  event_count: string;
  avg_duration: string | null;
  avg_lcp: string | null;
  avg_fcp: string | null;
  avg_cls: string | null;
};

type ErrorRow = {
  type: MonitorEventType;
  event_count: string;
  latest_at: Date;
};

export function createDatabasePool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
    ssl: false
  });
}

export async function ensureSchema(pool: pg.Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS monitor_events (
      id TEXT PRIMARY KEY,
      app_id TEXT NOT NULL,
      env TEXT NOT NULL,
      release TEXT NOT NULL,
      type TEXT NOT NULL,
      page_url TEXT NOT NULL,
      timestamp_ms BIGINT NOT NULL,
      sdk_version TEXT NOT NULL,
      trace_id TEXT,
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_monitor_events_type_created
      ON monitor_events (type, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_monitor_events_app_created
      ON monitor_events (app_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_monitor_events_page_url
      ON monitor_events (page_url);

    CREATE INDEX IF NOT EXISTS idx_monitor_events_data_gin
      ON monitor_events USING GIN (data);
  `);
}

export async function insertMonitorEvent(pool: pg.Pool, event: MonitorEvent) {
  await pool.query(
    `
      INSERT INTO monitor_events (
        id,
        app_id,
        env,
        release,
        type,
        page_url,
        timestamp_ms,
        sdk_version,
        trace_id,
        data
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO UPDATE SET
        app_id = EXCLUDED.app_id,
        env = EXCLUDED.env,
        release = EXCLUDED.release,
        type = EXCLUDED.type,
        page_url = EXCLUDED.page_url,
        timestamp_ms = EXCLUDED.timestamp_ms,
        sdk_version = EXCLUDED.sdk_version,
        trace_id = EXCLUDED.trace_id,
        data = EXCLUDED.data
    `,
    [
      event.id,
      event.appId,
      event.env,
      event.release,
      event.type,
      event.pageUrl,
      event.timestamp,
      event.sdkVersion,
      event.traceId ?? null,
      JSON.stringify(event.data)
    ]
  );
}

export function createCollectorApp(pool = createDatabasePool()) {
  const app = Fastify({
    logger: true
  });

  app.register(cors, {
    origin: true,
    methods: ["GET", "POST", "DELETE", "OPTIONS"]
  });

  app.addHook("onClose", async () => {
    await pool.end();
  });

  app.get("/api/health", async () => {
    await pool.query("SELECT 1");

    return {
      ok: true,
      service: "monitor-collector",
      database: "postgres"
    };
  });

  app.post("/api/events", async (request, reply) => {
    const events = normalizeEvents(request.body);

    if (events.length === 0) {
      return reply.code(400).send({
        message: "Expected a monitor event object or an array of monitor events."
      });
    }

    const invalidEvent = events.find((event) => !isMonitorEvent(event));

    if (invalidEvent) {
      return reply.code(400).send({
        message: "Invalid monitor event payload.",
        event: invalidEvent
      });
    }

    await Promise.all(
      events.map((event) => insertMonitorEvent(pool, event as MonitorEvent))
    );

    return reply.code(202).send({
      accepted: events.length,
      eventIds: events.map((event) => event.id)
    });
  });

  app.get<{ Querystring: EventQuery }>("/api/events", async (request) => {
    const limit = clampLimit(request.query.limit);
    const offset = toNonNegativeInt(request.query.offset, 0);
    const whereParts: string[] = [];
    const values: unknown[] = [];

    addWhere(whereParts, values, "type", request.query.type);
    addWhere(whereParts, values, "app_id", request.query.appId);
    addWhere(whereParts, values, "page_url", request.query.pageUrl);

    values.push(limit, offset);

    const result = await pool.query<DbRow>(
      `
        SELECT *
        FROM monitor_events
        ${whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : ""}
        ORDER BY created_at DESC
        LIMIT $${values.length - 1}
        OFFSET $${values.length}
      `,
      values
    );

    return {
      events: result.rows.map(mapEventRow)
    };
  });

  app.get("/api/overview", async () => {
    const result = await pool.query<{
      total_events: string;
      error_events: string;
      api_failures: string;
      resource_failures: string;
      blank_screens: string;
      avg_lcp: string | null;
      avg_api_duration: string | null;
    }>(`
      SELECT
        COUNT(*)::text AS total_events,
        COUNT(*) FILTER (WHERE type LIKE 'error.%')::text AS error_events,
        COUNT(*) FILTER (WHERE type = '${MONITOR_EVENT_TYPES.ERROR_API}')::text AS api_failures,
        COUNT(*) FILTER (WHERE type = '${MONITOR_EVENT_TYPES.ERROR_RESOURCE}')::text AS resource_failures,
        COUNT(*) FILTER (WHERE type = '${MONITOR_EVENT_TYPES.ERROR_BLANK_SCREEN}')::text AS blank_screens,
        ROUND(AVG((data->>'lcp')::numeric) FILTER (WHERE data ? 'lcp'), 2)::text AS avg_lcp,
        ROUND(AVG((data->>'duration')::numeric) FILTER (
          WHERE type IN ('${MONITOR_EVENT_TYPES.PERFORMANCE_API}', '${MONITOR_EVENT_TYPES.ERROR_API}')
            AND data ? 'duration'
        ), 2)::text AS avg_api_duration
      FROM monitor_events
    `);

    const row = result.rows[0];

    return {
      totalEvents: Number(row?.total_events ?? 0),
      errorEvents: Number(row?.error_events ?? 0),
      apiFailures: Number(row?.api_failures ?? 0),
      resourceFailures: Number(row?.resource_failures ?? 0),
      blankScreens: Number(row?.blank_screens ?? 0),
      avgLcp: toNullableNumber(row?.avg_lcp),
      avgApiDuration: toNullableNumber(row?.avg_api_duration)
    };
  });

  app.get("/api/performance", async () => {
    const result = await pool.query<PerformanceRow>(`
      SELECT
        type,
        COUNT(*)::text AS event_count,
        ROUND(AVG((data->>'duration')::numeric) FILTER (WHERE data ? 'duration'), 2)::text AS avg_duration,
        ROUND(AVG((data->>'lcp')::numeric) FILTER (WHERE data ? 'lcp'), 2)::text AS avg_lcp,
        ROUND(AVG((data->>'fcp')::numeric) FILTER (WHERE data ? 'fcp'), 2)::text AS avg_fcp,
        ROUND(AVG((data->>'cls')::numeric) FILTER (WHERE data ? 'cls'), 4)::text AS avg_cls
      FROM monitor_events
      WHERE type LIKE 'performance.%'
      GROUP BY type
      ORDER BY type
    `);

    return {
      groups: result.rows.map((row) => ({
        type: row.type,
        eventCount: Number(row.event_count),
        avgDuration: toNullableNumber(row.avg_duration),
        avgLcp: toNullableNumber(row.avg_lcp),
        avgFcp: toNullableNumber(row.avg_fcp),
        avgCls: toNullableNumber(row.avg_cls)
      }))
    };
  });

  app.get("/api/errors", async () => {
    const result = await pool.query<ErrorRow>(`
      SELECT
        type,
        COUNT(*)::text AS event_count,
        MAX(created_at) AS latest_at
      FROM monitor_events
      WHERE type LIKE 'error.%'
      GROUP BY type
      ORDER BY latest_at DESC
    `);

    return {
      groups: result.rows.map((row) => ({
        type: row.type,
        eventCount: Number(row.event_count),
        latestAt: row.latest_at
      }))
    };
  });

  app.get("/api/apis", async () => {
    const result = await pool.query<ApiAggregateRow>(`
      SELECT
        data->>'url' AS url,
        data->>'method' AS method,
        COUNT(*)::text AS request_count,
        ROUND(AVG((data->>'duration')::numeric) FILTER (WHERE data ? 'duration'), 2)::text AS avg_duration,
        ROUND(
          percentile_cont(0.95) WITHIN GROUP (ORDER BY (data->>'duration')::numeric)
          FILTER (WHERE data ? 'duration')::numeric,
          2
        )::text AS p95_duration,
        COUNT(*) FILTER (WHERE type = '${MONITOR_EVENT_TYPES.ERROR_API}')::text AS failure_count,
        ROUND(
          (
            COUNT(*) FILTER (WHERE type = '${MONITOR_EVENT_TYPES.ERROR_API}')::numeric
            / NULLIF(COUNT(*), 0)
          ),
          4
        )::text AS failure_rate
      FROM monitor_events
      WHERE type IN ('${MONITOR_EVENT_TYPES.PERFORMANCE_API}', '${MONITOR_EVENT_TYPES.ERROR_API}')
      GROUP BY data->>'url', data->>'method'
      ORDER BY COUNT(*) DESC,
        COUNT(*) FILTER (WHERE type = '${MONITOR_EVENT_TYPES.ERROR_API}') DESC
    `);

    return {
      apis: result.rows.map((row) => ({
        url: row.url,
        method: row.method,
        requestCount: Number(row.request_count),
        avgDuration: toNullableNumber(row.avg_duration),
        p95Duration: toNullableNumber(row.p95_duration),
        failureCount: Number(row.failure_count),
        failureRate: Number(row.failure_rate)
      }))
    };
  });

  app.delete("/api/events", async () => {
    await pool.query("TRUNCATE monitor_events");

    return {
      deleted: true
    };
  });

  return app;
}

function normalizeEvents(body: unknown) {
  if (Array.isArray(body)) {
    return body;
  }

  if (body && typeof body === "object") {
    return [body];
  }

  return [];
}

function isMonitorEvent(event: unknown): event is MonitorEvent {
  if (!event || typeof event !== "object") {
    return false;
  }

  const candidate = event as Partial<MonitorEvent>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.appId === "string" &&
    typeof candidate.env === "string" &&
    typeof candidate.release === "string" &&
    typeof candidate.type === "string" &&
    Object.values(MONITOR_EVENT_TYPES).includes(candidate.type) &&
    typeof candidate.pageUrl === "string" &&
    typeof candidate.timestamp === "number" &&
    typeof candidate.sdkVersion === "string" &&
    Boolean(candidate.data) &&
    typeof candidate.data === "object"
  );
}

function mapEventRow(row: DbRow): MonitorEvent & { createdAt: Date } {
  return {
    id: row.id,
    appId: row.app_id,
    env: row.env as MonitorEvent["env"],
    release: row.release,
    type: row.type,
    pageUrl: row.page_url,
    timestamp: Number(row.timestamp_ms),
    sdkVersion: row.sdk_version,
    traceId: row.trace_id ?? undefined,
    data: row.data,
    createdAt: row.created_at
  };
}

function addWhere(
  whereParts: string[],
  values: unknown[],
  column: string,
  value: unknown
) {
  if (typeof value !== "string" || value.length === 0) {
    return;
  }

  values.push(value);
  whereParts.push(`${column} = $${values.length}`);
}

function clampLimit(value: string | undefined) {
  return Math.min(toNonNegativeInt(value, 100), 500);
}

function toNonNegativeInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
}

function toNullableNumber(value: string | null | undefined) {
  return value == null ? null : Number(value);
}

if (process.env.NODE_ENV !== "test") {
  const pool = createDatabasePool();
  const app = createCollectorApp(pool);

  ensureSchema(pool)
    .then(() =>
      app.listen({
        port: Number(process.env.PORT ?? DEFAULT_PORT),
        host: "0.0.0.0"
      })
    )
    .catch((error: unknown) => {
      app.log.error(error);
      process.exitCode = 1;
    });
}
