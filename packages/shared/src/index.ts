export const MONITOR_EVENT_TYPES = {
  PERFORMANCE_PAGE: "performance.page",
  PERFORMANCE_API: "performance.api",
  PERFORMANCE_RESOURCE: "performance.resource",
  ERROR_JS: "error.js",
  ERROR_PROMISE: "error.promise",
  ERROR_API: "error.api",
  ERROR_RESOURCE: "error.resource",
  ERROR_BLANK_SCREEN: "error.blank_screen"
} as const;

export type MonitorEventType =
  (typeof MONITOR_EVENT_TYPES)[keyof typeof MONITOR_EVENT_TYPES];

export type MonitorEnvironment = "local" | "development" | "test" | "production";

export type MonitorEvent = {
  id: string;
  appId: string;
  env: MonitorEnvironment;
  release: string;
  type: MonitorEventType;
  pageUrl: string;
  timestamp: number;
  sdkVersion: string;
  traceId?: string;
  data: Record<string, unknown>;
};

export type MonitorEventPayload = Omit<MonitorEvent, "id" | "timestamp"> & {
  id?: string;
  timestamp?: number;
};

export const DEFAULT_APP_ID = "mini-shop-web";
export const DEFAULT_ENV: MonitorEnvironment = "local";
export const DEFAULT_RELEASE = "0.1.0";

export type ProductCategory = "apparel" | "drinkware" | "accessory" | "device";

export type Product = {
  id: string;
  title: string;
  subtitle: string;
  category: ProductCategory;
  price: number;
  rating: number;
  imageUrl: string;
  description: string;
};

export type HomePayload = {
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string;
  featuredProducts: Product[];
};

export type ProductListPayload = {
  products: Product[];
  total: number;
  scenario: FaultScenario;
};

export type ProductDetailPayload = {
  product: Product;
  relatedProducts: Product[];
  scenario: FaultScenario;
};

export type FaultScenario = {
  delayMs: number;
  large: boolean;
  brokenImage: boolean;
  malformed: boolean;
};
