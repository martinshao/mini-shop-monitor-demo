import { roundDuration } from "../utils/timing";
import { shouldReportResource } from "./resource";
import type { Collector, CollectorContext } from "./types";

export function createPageLoadCollector(): Collector {
  const pageMetrics: Record<string, number> = {};

  return {
    name: "page-load",
    install({ options, capture }) {
      collectNavigationMetrics(pageMetrics);
      observeWebVitals(pageMetrics, options.collectorUrl, capture);

      window.addEventListener("load", () => {
        window.setTimeout(() => {
          collectNavigationMetrics(pageMetrics);
          reportPagePerformance(pageMetrics, capture);
        }, 800);
      });

      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
          reportPagePerformance(pageMetrics, capture);
        }
      });
    }
  };
}

function collectNavigationMetrics(pageMetrics: Record<string, number>) {
  const navigation = performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  const paintEntries = performance.getEntriesByType("paint");

  if (navigation) {
    Object.assign(pageMetrics, {
      dns: roundDuration(navigation.domainLookupEnd - navigation.domainLookupStart),
      tcp: roundDuration(navigation.connectEnd - navigation.connectStart),
      request: roundDuration(navigation.responseStart - navigation.requestStart),
      response: roundDuration(navigation.responseEnd - navigation.responseStart),
      domInteractive: roundDuration(navigation.domInteractive),
      domContentLoaded: roundDuration(
        navigation.domContentLoadedEventEnd - navigation.startTime
      ),
      load: roundDuration(navigation.loadEventEnd - navigation.startTime)
    });
  }

  paintEntries.forEach((entry) => {
    if (entry.name === "first-contentful-paint") {
      pageMetrics.fcp = roundDuration(entry.startTime);
    }
  });
}

function observeWebVitals(
  pageMetrics: Record<string, number>,
  collectorUrl: string,
  capture: CollectorContext["capture"]
) {
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
    capture({
      kind: "longtask",
      data: {
        metric: "longtask",
        name: entry.name,
        startTime: roundDuration(entry.startTime),
        duration: roundDuration(entry.duration)
      }
    });
  });

  observePerformanceEntry("resource", (entry) => {
    const resource = entry as PerformanceResourceTiming;

    if (!shouldReportResource(resource, collectorUrl)) {
      return;
    }

    capture({
      kind: "resource-performance",
      data: {
        name: resource.name,
        initiatorType: resource.initiatorType,
        duration: roundDuration(resource.duration),
        transferSize: resource.transferSize,
        decodedBodySize: resource.decodedBodySize
      }
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

function reportPagePerformance(
  pageMetrics: Record<string, number>,
  capture: CollectorContext["capture"]
) {
  if (Object.keys(pageMetrics).length === 0) {
    return;
  }

  capture({
    kind: "page-load",
    data: {
      metric: "page-load",
      ...pageMetrics
    }
  });
}
