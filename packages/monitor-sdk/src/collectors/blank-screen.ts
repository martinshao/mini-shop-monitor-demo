import type { ResolvedMonitorOptions } from "../config/options";
import type { RawMonitorRecord } from "../processor/event-processor";
import type { Collector } from "./types";

export type BlankScreenCollector = Collector & {
  check: () => boolean;
};

export function createBlankScreenCollector(): BlankScreenCollector {
  // 白屏检测需要支持手动触发 check，所以保留 collector 内部状态和上下文引用。
  let options: ResolvedMonitorOptions | null = null;
  let capture: ((record: RawMonitorRecord) => void) | null = null;
  let reported = false;

  return {
    name: "blank-screen",
    install(context) {
      options = context.options;
      capture = context.capture;

      // 初次渲染后延迟检测，避免正常首屏加载过程被误判为空白。
      window.setTimeout(() => {
        this.check();
      }, 1500);

      // DOM 变化后再次检测，用于捕获实验页把主内容清空的白屏场景。
      const observer = new MutationObserver(() => {
        window.setTimeout(() => {
          this.check();
        }, 120);
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    },
    check() {
      // 同一次页面生命周期只上报一次白屏，避免 MutationObserver 连续触发造成重复事件。
      if (!options || !capture || reported) {
        return false;
      }

      const blankTarget = options.blankScreenSelectors
        .map((selector) => document.querySelector(selector))
        .find((element) => element && isElementBlank(element));

      if (!blankTarget) {
        return false;
      }

      reported = true;
      capture({
        kind: "blank-screen",
        data: {
          selector: options.blankScreenSelectors.find((selector) =>
            document.querySelector(selector)?.isSameNode(blankTarget)
          ),
          htmlLength: blankTarget.innerHTML.length
        }
      });

      return true;
    }
  };
}

function isElementBlank(element: Element) {
  // 当前阶段用“无文本且无关键可见业务元素”作为轻量白屏判断。
  const text = element.textContent?.trim() ?? "";
  const meaningfulChildren = element.querySelector(
    "img,svg,canvas,video,button,a,input,select,textarea,h1,h2,h3,p,article,section"
  );

  return text.length === 0 && !meaningfulChildren;
}
