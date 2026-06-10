import { isUrlAllowed } from "../config/options";
import { getErrorMessage } from "../utils/error";
import { roundDuration } from "../utils/timing";
import { isSameUrl } from "../utils/url";
import type { Collector } from "./types";

type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];

let originalFetch: typeof fetch | null = null;

export function createApiCollector(): Collector {
  return {
    name: "api",
    install({ options, capture, internalFetch }) {
      // fetch 代理只能安装一次；internalFetch 保存原始发送器，避免 collector 上报请求递归采集自身。
      if (originalFetch || !internalFetch) {
        return;
      }

      originalFetch = internalFetch;

      window.fetch = async (input: FetchInput, init?: FetchInit) => {
        const startTime = performance.now();
        const requestUrl = getFetchUrl(input);
        const method = getFetchMethod(input, init);

        if (
          // collectorUrl 和过滤规则命中的请求不进入 API 采集，避免噪音和循环上报。
          isSameUrl(requestUrl, options.collectorUrl) ||
          !isUrlAllowed(requestUrl, options.allowUrls, options.denyUrls)
        ) {
          return originalFetch?.(input, init) ?? fetch(input, init);
        }

        try {
          const response = await (originalFetch?.(input, init) ?? fetch(input, init));
          const duration = roundDuration(performance.now() - startTime);

          // API Collector 只描述原始请求结果，成功/失败事件类型由 Processor 根据 ok 字段决定。
          capture({
            kind: "api",
            data: {
              url: requestUrl,
              method,
              status: response.status,
              ok: response.ok,
              duration
            }
          });

          return response;
        } catch (error) {
          const duration = roundDuration(performance.now() - startTime);

          // 网络错误没有 HTTP 状态码，用 status=0 表示请求未获得服务端响应。
          capture({
            kind: "api",
            data: {
              url: requestUrl,
              method,
              status: 0,
              ok: false,
              duration,
              message: getErrorMessage(error)
            }
          });

          throw error;
        }
      };
    }
  };
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
