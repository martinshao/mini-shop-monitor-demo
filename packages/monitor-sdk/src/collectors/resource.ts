import { isSameUrl } from "../utils/url";
import type { Collector } from "./types";

export function createResourceCollector(): Collector {
  return {
    name: "resource",
    install({ capture }) {
      // 资源加载失败不会冒泡到普通 error 监听，必须使用 capture 阶段捕获。
      window.addEventListener(
        "error",
        (event) => {
          if (!isResourceElement(event.target)) {
            return;
          }

          const target = event.target;

          capture({
            kind: "resource-error",
            data: {
              tagName: target.tagName.toLowerCase(),
              url: getResourceUrl(target),
              outerHTML: target.outerHTML.slice(0, 300)
            }
          });
        },
        true
      );
    }
  };
}

export function isResourceElement(target: EventTarget | null): target is HTMLElement {
  // 这里只识别当前阶段关注的静态资源元素，避免把普通 DOM error 误判为资源失败。
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return ["IMG", "SCRIPT", "LINK"].includes(target.tagName);
}

export function getResourceUrl(target: HTMLElement) {
  if (target instanceof HTMLImageElement || target instanceof HTMLScriptElement) {
    return target.src;
  }

  if (target instanceof HTMLLinkElement) {
    return target.href;
  }

  return "";
}

export function shouldReportResource(
  resource: PerformanceResourceTiming,
  collectorUrl: string
) {
  // 过滤 collector 自身请求，否则监控上报会污染资源性能数据。
  if (isSameUrl(resource.name, collectorUrl)) {
    return false;
  }

  return ["img", "script", "link", "css"].includes(resource.initiatorType);
}
