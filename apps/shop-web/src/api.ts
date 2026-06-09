import type {
  HomePayload,
  ProductDetailPayload,
  ProductListPayload
} from "@mini-shop-monitor/shared";

const API_BASE_URL = "";

export type ScenarioQuery = {
  delay?: number;
  status?: number;
  large?: boolean;
  brokenImage?: boolean;
  malformed?: boolean;
};

function toSearchParams(query: ScenarioQuery = {}) {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== false) {
      params.set(key, String(value));
    }
  });

  return params.toString();
}

async function getJson<T>(path: string, query?: ScenarioQuery): Promise<T> {
  const search = toSearchParams(query);
  const response = await fetch(`${API_BASE_URL}${path}${search ? `?${search}` : ""}`);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function getHome(query?: ScenarioQuery) {
  return getJson<HomePayload>("/api/home", query);
}

export function getProducts(query?: ScenarioQuery) {
  return getJson<ProductListPayload>("/api/products", query);
}

export function getProductDetail(id: string, query?: ScenarioQuery) {
  return getJson<ProductDetailPayload>(`/api/products/${id}`, query);
}
