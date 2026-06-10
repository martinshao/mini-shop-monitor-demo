import { createApiCollector } from "./api";
import { createBlankScreenCollector } from "./blank-screen";
import { createErrorCollector } from "./error";
import { createPageLoadCollector } from "./page-load";
import { createResourceCollector } from "./resource";

export function createCollectors() {
  const blankScreenCollector = createBlankScreenCollector();

  return {
    collectors: [
      createApiCollector(),
      createErrorCollector(),
      createResourceCollector(),
      createPageLoadCollector(),
      blankScreenCollector
    ],
    blankScreenCollector
  };
}
