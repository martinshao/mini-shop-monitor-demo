import { getErrorMessage } from "../utils/error";
import { isResourceElement } from "./resource";
import type { Collector } from "./types";

export function createErrorCollector(): Collector {
  return {
    name: "error",
    install({ capture }) {
      // window error 同时会收到资源加载失败，资源类错误交给 Resource Collector 处理。
      window.addEventListener("error", (event) => {
        if (isResourceElement(event.target)) {
          return;
        }

        // JS 运行时异常保留文件、行列和 stack，方便后续控制台定位问题页面。
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

      // Promise 未处理异常不会进入 window error，需要单独监听 unhandledrejection。
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
