import { getErrorMessage } from "../utils/error";
import { isResourceElement } from "./resource";
import type { Collector } from "./types";

export function createErrorCollector(): Collector {
  return {
    name: "error",
    install({ capture }) {
      window.addEventListener("error", (event) => {
        if (isResourceElement(event.target)) {
          return;
        }

        capture({
          kind: "js-error",
          data: {
            message: event.message,
            source: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            stack: event.error instanceof Error ? event.error.stack : undefined
          }
        });
      });

      window.addEventListener("unhandledrejection", (event) => {
        capture({
          kind: "promise-error",
          data: {
            message: getErrorMessage(event.reason),
            stack: event.reason instanceof Error ? event.reason.stack : undefined
          }
        });
      });
    }
  };
}
