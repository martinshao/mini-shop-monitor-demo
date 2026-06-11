import { roundDuration } from "../utils/timing";
import { shouldReportResource } from "./resource";
import type { Collector, CollectorContext } from "./types";

export function createPageLoadCollector(): Collector {
  // 页面性能指标会在多个 PerformanceObserver 回调中逐步补齐，所以用闭包保存累计值。
  const pageMetrics: Record<string, number> = {};

  return {
    name: "page-load",
    install({ options, capture }) {
      // 初始化时先读取 buffered navigation/paint，避免错过 SDK 初始化前已经产生的性能条目。
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
  // Navigation Timing 提供 DNS/TCP/请求/DOM/load 等页面基础耗时。
  const navigation = performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  const paintEntries = performance.getEntriesByType("paint");

  if (navigation) {
    Object.assign(pageMetrics, {
      dns: roundDuration(
        navigation.domainLookupEnd - navigation.domainLookupStart
      ),
      tcp: roundDuration(navigation.connectEnd - navigation.connectStart),
      request: roundDuration(
        navigation.responseStart - navigation.requestStart
      ),
      response: roundDuration(
        navigation.responseEnd - navigation.responseStart
      ),
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

  // LCP/CLS/longtask/resource 使用 PerformanceObserver 监听，支持 buffered 读取历史条目。
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

    // 资源性能和资源失败是两类信号：这里记录加载成功资源的耗时和体积。
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
    // 某些浏览器不支持所有 entry type，忽略即可，不影响其它采集器。
  }
}

function reportPagePerformance(
  pageMetrics: Record<string, number>,
  capture: CollectorContext["capture"]
) {
  if (Object.keys(pageMetrics).length === 0) {
    return;
  }

  // 页面加载事件采用汇总上报，避免 FCP/LCP/CLS 每个指标各打一条基础事件。
  capture({
    kind: "page-load",
    data: {
      metric: "page-load",
      ...pageMetrics
    }
  });
}
