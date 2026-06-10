import {
  DEFAULT_APP_ID,
  DEFAULT_ENV,
  DEFAULT_RELEASE,
  MONITOR_EVENT_TYPES,
  type MonitorEnvironment,
  type MonitorEvent,
  type MonitorEventPayload,
  type MonitorEventType
} from "@mini-shop-monitor/shared";

const SDK_VERSION = "0.1.0";
const DEBUG_STORAGE_KEY = "__MINI_SHOP_MONITOR_EVENTS__";

export type MonitorInitOptions = {
  appId?: string;
  env?: MonitorEnvironment;
  release?: string;
  collectorUrl: string;
  sampleRate?: number;
  debug?: boolean;
  blankScreenSelectors?: string[];
};

type ActiveMonitorOptions = Required<MonitorInitOptions>;

type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];

let activeOptions: ActiveMonitorOptions | null = null;
let originalFetch: typeof fetch | null = null;
let installed = false;
let pageMetrics: Record<string, number> = {};
let blankScreenReported = false;

const bufferedEvents: MonitorEvent[] = [];

declare global {
  interface Window {
    __MONITOR_DEBUG__?: {
      getBufferedEvents: typeof getBufferedEvents;
      clearBufferedEvents: typeof clearBufferedEvents;
      checkBlankScreen: typeof checkBlankScreen;
    };
  }
}

export function initMonitor(options: MonitorInitOptions) {
  activeOptions = {
    appId: options.appId ?? DEFAULT_APP_ID,
    env: options.env ?? DEFAULT_ENV,
    release: options.release ?? DEFAULT_RELEASE,
    collectorUrl: options.collectorUrl,
    sampleRate: options.sampleRate ?? 1,
    debug: options.debug ?? false,
    blankScreenSelectors: options.blankScreenSelectors ?? ["#shop-root", "#root"]
  };

  if (!installed && isBrowser()) {
    installed = true;
    installFetchProxy();
    installErrorListeners();
    installResourceErrorListener();
    installPagePerformanceCollectors();
    installBlankScreenDetector();
  }

  if (activeOptions.debug && isBrowser()) {
    window.__MONITOR_DEBUG__ = {
      getBufferedEvents,
      clearBufferedEvents,
      checkBlankScreen
    };
  }

  return activeOptions;
}

export function getMonitorOptions() {
  return activeOptions;
}

export function getBufferedEvents() {
  return [...bufferedEvents];
}

export function clearBufferedEvents() {
  bufferedEvents.length = 0;
}

export function createMonitorEventPayload(
  payload: Omit<MonitorEventPayload, "appId" | "env" | "release" | "sdkVersion">
): MonitorEventPayload {
  const options = requireOptions();

  return {
    ...payload,
    appId: options.appId,
    env: options.env,
    release: options.release,
    sdkVersion: SDK_VERSION
  };
}

export function sendEvent(payload: MonitorEventPayload) {
  const options = requireOptions();

  if (!shouldSample(options.sampleRate)) {
    return;
  }

  const event: MonitorEvent = {
    ...payload,
    id: payload.id ?? createEventId(),
    timestamp: payload.timestamp ?? Date.now()
  };

  bufferedEvents.push(event);

  if (options.debug) {
    writeDebugStorage();
    writeDebugDomState();
    console.info("[monitor-sdk]", event.type, event);
  }

  void reportEvent(event, options);
}

export function reportCustomEvent(
  type: MonitorEventType,
  data: Record<string, unknown>,
  pageUrl = getPageUrl()
) {
  sendEvent(
    createMonitorEventPayload({
      type,
      pageUrl,
      data
    })
  );
}

export function checkBlankScreen() {
  if (!isBrowser() || !activeOptions || blankScreenReported) {
    return false;
  }

  const blankTarget = activeOptions.blankScreenSelectors
    .map((selector) => document.querySelector(selector))
    .find((element) => element && isElementBlank(element));

  if (!blankTarget) {
    return false;
  }

  blankScreenReported = true;
  reportCustomEvent(MONITOR_EVENT_TYPES.ERROR_BLANK_SCREEN, {
    selector: activeOptions.blankScreenSelectors.find((selector) =>
      document.querySelector(selector)?.isSameNode(blankTarget)
    ),
    htmlLength: blankTarget.innerHTML.length
  });

  return true;
}

export function getDebugStorageKey() {
  return DEBUG_STORAGE_KEY;
}

function installFetchProxy() {
  if (!isBrowser() || originalFetch) {
    return;
  }

  originalFetch = window.fetch.bind(window);

  window.fetch = async (input: FetchInput, init?: FetchInit) => {
    const options = activeOptions;
    const startTime = performance.now();
    const requestUrl = getFetchUrl(input);
    const method = getFetchMethod(input, init);

    if (!options || isCollectorRequest(requestUrl, options.collectorUrl)) {
      return originalFetch?.(input, init) ?? fetch(input, init);
    }

    try {
      const response = await (originalFetch?.(input, init) ?? fetch(input, init));
      const duration = roundDuration(performance.now() - startTime);
      const eventType = response.ok
        ? MONITOR_EVENT_TYPES.PERFORMANCE_API
        : MONITOR_EVENT_TYPES.ERROR_API;

      reportCustomEvent(eventType, {
        url: requestUrl,
        method,
        status: response.status,
        ok: response.ok,
        duration
      });

      return response;
    } catch (error) {
      const duration = roundDuration(performance.now() - startTime);

      reportCustomEvent(MONITOR_EVENT_TYPES.ERROR_API, {
        url: requestUrl,
        method,
        status: 0,
        ok: false,
        duration,
        message: getErrorMessage(error)
      });

      throw error;
    }
  };
}

function installErrorListeners() {
  window.addEventListener("error", (event) => {
    if (isResourceElement(event.target)) {
      return;
    }

    reportCustomEvent(MONITOR_EVENT_TYPES.ERROR_JS, {
      message: event.message,
      source: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error instanceof Error ? event.error.stack : undefined
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    reportCustomEvent(MONITOR_EVENT_TYPES.ERROR_PROMISE, {
      message: getErrorMessage(event.reason),
      stack: event.reason instanceof Error ? event.reason.stack : undefined
    });
  });
}

function installResourceErrorListener() {
  window.addEventListener(
    "error",
    (event) => {
      if (!isResourceElement(event.target)) {
        return;
      }

      const target = event.target;

      reportCustomEvent(MONITOR_EVENT_TYPES.ERROR_RESOURCE, {
        tagName: target.tagName.toLowerCase(),
        url: getResourceUrl(target),
        outerHTML: target.outerHTML.slice(0, 300)
      });
    },
    true
  );
}

function installPagePerformanceCollectors() {
  collectNavigationMetrics();
  observeWebVitals();

  window.addEventListener("load", () => {
    window.setTimeout(() => {
      collectNavigationMetrics();
      reportPagePerformance();
    }, 800);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      reportPagePerformance();
    }
  });
}

function collectNavigationMetrics() {
  const navigation = performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  const paintEntries = performance.getEntriesByType("paint");

  if (navigation) {
    pageMetrics = {
      ...pageMetrics,
      dns: roundDuration(navigation.domainLookupEnd - navigation.domainLookupStart),
      tcp: roundDuration(navigation.connectEnd - navigation.connectStart),
      request: roundDuration(navigation.responseStart - navigation.requestStart),
      response: roundDuration(navigation.responseEnd - navigation.responseStart),
      domInteractive: roundDuration(navigation.domInteractive),
      domContentLoaded: roundDuration(
        navigation.domContentLoadedEventEnd - navigation.startTime
      ),
      load: roundDuration(navigation.loadEventEnd - navigation.startTime)
    };
  }

  paintEntries.forEach((entry) => {
    if (entry.name === "first-contentful-paint") {
      pageMetrics.fcp = roundDuration(entry.startTime);
    }
  });
}

function observeWebVitals() {
  if (!("PerformanceObserver" in window)) {
    return;
  }

  observePerformanceEntry("largest-contentful-paint", (entry) => {
    pageMetrics.lcp = roundDuration(entry.startTime);
  });

  let cls = 0;
  observePerformanceEntry("layout-shift", (entry) => {
    const layoutShift = entry as PerformanceEntry & {
      hadRecentInput?: boolean;
      value?: number;
    };

    if (!layoutShift.hadRecentInput) {
      cls += layoutShift.value ?? 0;
      pageMetrics.cls = Number(cls.toFixed(4));
    }
  });

  observePerformanceEntry("longtask", (entry) => {
    reportCustomEvent(MONITOR_EVENT_TYPES.PERFORMANCE_PAGE, {
      metric: "longtask",
      name: entry.name,
      startTime: roundDuration(entry.startTime),
      duration: roundDuration(entry.duration)
    });
  });

  observePerformanceEntry("resource", (entry) => {
    const resource = entry as PerformanceResourceTiming;

    if (!shouldReportResource(resource)) {
      return;
    }

    reportCustomEvent(MONITOR_EVENT_TYPES.PERFORMANCE_RESOURCE, {
      name: resource.name,
      initiatorType: resource.initiatorType,
      duration: roundDuration(resource.duration),
      transferSize: resource.transferSize,
      decodedBodySize: resource.decodedBodySize
    });
  });
}

function observePerformanceEntry(
  type: string,
  handler: (entry: PerformanceEntry) => void
) {
  try {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach(handler);
    });

    observer.observe({ type, buffered: true });
  } catch {
    // Some browsers do not support every performance entry type.
  }
}

function reportPagePerformance() {
  if (Object.keys(pageMetrics).length === 0) {
    return;
  }

  reportCustomEvent(MONITOR_EVENT_TYPES.PERFORMANCE_PAGE, {
    metric: "page-load",
    ...pageMetrics
  });
}

function writeDebugStorage() {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.setItem(
      DEBUG_STORAGE_KEY,
      JSON.stringify(bufferedEvents.slice(-100))
    );
  } catch {
    // Debug storage must never affect the monitored page.
  }
}

function writeDebugDomState() {
  if (!isBrowser()) {
    return;
  }

  const eventTypes = bufferedEvents.map((event) => event.type);
  const latestEvent = bufferedEvents.at(-1);

  document.documentElement.dataset.monitorEventCount = String(bufferedEvents.length);
  document.documentElement.dataset.monitorEventTypes = eventTypes.join(",");
  document.documentElement.dataset.monitorLatestEvent = latestEvent
    ? JSON.stringify({
        type: latestEvent.type,
        pageUrl: latestEvent.pageUrl,
        data: latestEvent.data
      })
    : "";
}

function installBlankScreenDetector() {
  window.setTimeout(() => {
    checkBlankScreen();
  }, 1500);

  const observer = new MutationObserver(() => {
    window.setTimeout(() => {
      checkBlankScreen();
    }, 120);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

async function reportEvent(event: MonitorEvent, options: ActiveMonitorOptions) {
  if (!isBrowser()) {
    return;
  }

  try {
    await originalFetch?.(options.collectorUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(event),
      keepalive: true
    });
  } catch (error) {
    if (options.debug) {
      console.warn("[monitor-sdk] report failed", getErrorMessage(error));
    }
  }
}

function shouldReportResource(resource: PerformanceResourceTiming) {
  if (!activeOptions) {
    return false;
  }

  if (isCollectorRequest(resource.name, activeOptions.collectorUrl)) {
    return false;
  }

  return ["img", "script", "link", "css"].includes(resource.initiatorType);
}

function isElementBlank(element: Element) {
  const text = element.textContent?.trim() ?? "";
  const meaningfulChildren = element.querySelector(
    "img,svg,canvas,video,button,a,input,select,textarea,h1,h2,h3,p,article,section"
  );

  return text.length === 0 && !meaningfulChildren;
}

function isResourceElement(target: EventTarget | null): target is HTMLElement {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return ["IMG", "SCRIPT", "LINK"].includes(target.tagName);
}

function getResourceUrl(target: HTMLElement) {
  if (target instanceof HTMLImageElement || target instanceof HTMLScriptElement) {
    return target.src;
  }

  if (target instanceof HTMLLinkElement) {
    return target.href;
  }

  return "";
}

function getFetchUrl(input: FetchInput) {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  return input.url;
}

function getFetchMethod(input: FetchInput, init?: FetchInit) {
  if (init?.method) {
    return init.method.toUpperCase();
  }

  if (typeof input !== "string" && !(input instanceof URL)) {
    return input.method.toUpperCase();
  }

  return "GET";
}

function isCollectorRequest(requestUrl: string, collectorUrl: string) {
  try {
    return new URL(requestUrl, window.location.href).href ===
      new URL(collectorUrl, window.location.href).href;
  } catch {
    return requestUrl === collectorUrl;
  }
}

function shouldSample(sampleRate: number) {
  return sampleRate >= 1 || Math.random() <= sampleRate;
}

function createEventId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function roundDuration(value: number) {
  return Number(value.toFixed(2));
}

function getPageUrl() {
  return isBrowser() ? window.location.href : "";
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function requireOptions() {
  if (!activeOptions) {
    throw new Error("Monitor SDK must be initialized before creating events.");
  }

  return activeOptions;
}

function isBrowser() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}
