import { isSameUrl } from "../utils/url";
import type { Collector } from "./types";

export function createResourceCollector(): Collector {
  return {
    name: "resource",
    install({ capture }) {
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
  if (isSameUrl(resource.name, collectorUrl)) {
    return false;
  }

  return ["img", "script", "link", "css"].includes(resource.initiatorType);
}
