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
      if (originalFetch || !internalFetch) {
        return;
      }

      originalFetch = internalFetch;

      window.fetch = async (input: FetchInput, init?: FetchInit) => {
        const startTime = performance.now();
        const requestUrl = getFetchUrl(input);
        const method = getFetchMethod(input, init);

        if (
          isSameUrl(requestUrl, options.collectorUrl) ||
          !isUrlAllowed(requestUrl, options.allowUrls, options.denyUrls)
        ) {
          return originalFetch?.(input, init) ?? fetch(input, init);
        }

        try {
          const response = await (originalFetch?.(input, init) ?? fetch(input, init));
          const duration = roundDuration(performance.now() - startTime);

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
