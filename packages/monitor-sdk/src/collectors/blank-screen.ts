import type { ResolvedMonitorOptions } from "../config/options";
import type { RawMonitorRecord } from "../processor/event-processor";
import type { Collector } from "./types";

export type BlankScreenCollector = Collector & {
  check: () => boolean;
};

export function createBlankScreenCollector(): BlankScreenCollector {
  let options: ResolvedMonitorOptions | null = null;
  let capture: ((record: RawMonitorRecord) => void) | null = null;
  let reported = false;

  return {
    name: "blank-screen",
    install(context) {
      options = context.options;
      capture = context.capture;

      window.setTimeout(() => {
        this.check();
      }, 1500);

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
  const text = element.textContent?.trim() ?? "";
  const meaningfulChildren = element.querySelector(
    "img,svg,canvas,video,button,a,input,select,textarea,h1,h2,h3,p,article,section"
  );

  return text.length === 0 && !meaningfulChildren;
}
