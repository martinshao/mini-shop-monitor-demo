import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import type { Product } from "@mini-shop-monitor/shared";
import { DEFAULT_APP_ID } from "@mini-shop-monitor/shared";
import { initMonitor } from "@mini-shop-monitor/monitor-sdk";
import {
  getHome,
  getProductDetail,
  getProducts,
  type ScenarioQuery
} from "./api";
import "./styles.css";

initMonitor({
  appId: DEFAULT_APP_ID,
  env: "local",
  release: "0.1.0",
  collectorUrl: "http://localhost:4000/api/events",
  debug: true
});

type Route =
  | { name: "home" }
  | { name: "products" }
  | { name: "detail"; id: string }
  | { name: "lab" };

function getRoute(): Route {
  const path = window.location.pathname;

  if (path === "/products") {
    return { name: "products" };
  }

  if (path.startsWith("/products/")) {
    return { name: "detail", id: path.split("/").at(-1) ?? "p-1001" };
  }

  if (path === "/lab") {
    return { name: "lab" };
  }

  return { name: "home" };
}

function navigate(path: string) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function useRoute() {
  const [route, setRoute] = useState<Route>(getRoute);

  useEffect(() => {
    const handleRouteChange = () => setRoute(getRoute());

    window.addEventListener("popstate", handleRouteChange);

    return () => window.removeEventListener("popstate", handleRouteChange);
  }, []);

  return route;
}

function useAsyncData<T>(loader: () => Promise<T>, deps: React.DependencyList) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError(null);

    loader()
      .then((value) => {
        if (active) {
          setData(value);
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : String(reason));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, deps);

  return { data, error, loading };
}

function ProductCard({ product }: { product: Product }) {
  return (
    <article className="product-card">
      <img src={product.imageUrl} alt={product.title} loading="lazy" />
      <div>
        <p className="eyebrow">{product.category}</p>
        <h3>{product.title}</h3>
        <p>{product.subtitle}</p>
        <div className="product-meta">
          <span>${product.price}</span>
          <span>{product.rating.toFixed(1)} rating</span>
        </div>
        <button type="button" onClick={() => navigate(`/products/${product.id}`)}>
          View detail
        </button>
      </div>
    </article>
  );
}

function LoadingState({ label }: { label: string }) {
  return <div className="state-panel">{label}</div>;
}

function ErrorState({ message }: { message: string }) {
  return <div className="state-panel error-state">{message}</div>;
}

function HomePage() {
  const { data, error, loading } = useAsyncData(() => getHome(), []);

  if (loading) {
    return <LoadingState label="Loading home scenario..." />;
  }

  if (error || !data) {
    return <ErrorState message={error ?? "Home payload missing"} />;
  }

  return (
    <main>
      <section className="hero">
        <img src={data.heroImageUrl} alt="" />
        <div className="hero-copy">
          <p className="eyebrow">Monitoring sandbox</p>
          <h1>{data.heroTitle}</h1>
          <p>{data.heroSubtitle}</p>
          <div className="hero-actions">
            <button type="button" onClick={() => navigate("/products")}>
              Browse products
            </button>
            <button type="button" onClick={() => navigate("/lab")}>
              Open lab
            </button>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">Featured</p>
          <h2>Realistic cards for resource and layout signals</h2>
        </div>
        <div className="product-grid">
          {data.featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </main>
  );
}

function ProductsPage() {
  const { data, error, loading } = useAsyncData(() => getProducts(), []);

  if (loading) {
    return <LoadingState label="Loading product list..." />;
  }

  if (error || !data || !Array.isArray(data.products)) {
    return <ErrorState message={error ?? "Product list payload malformed"} />;
  }

  return (
    <main className="section">
      <div className="section-heading">
        <p className="eyebrow">Product list</p>
        <h1>{data.total} products available</h1>
        <p>Use the lab page to trigger slow lists, failed APIs, bad images, and large payloads.</p>
      </div>
      <div className="product-grid">
        {data.products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </main>
  );
}

function ProductDetailPage({ id }: { id: string }) {
  const { data, error, loading } = useAsyncData(() => getProductDetail(id), [id]);

  if (loading) {
    return <LoadingState label="Loading product detail..." />;
  }

  if (error || !data || !data.product) {
    return <ErrorState message={error ?? "Product detail payload malformed"} />;
  }

  return (
    <main className="detail-layout">
      <img className="detail-image" src={data.product.imageUrl} alt={data.product.title} />
      <section className="detail-copy">
        <p className="eyebrow">{data.product.category}</p>
        <h1>{data.product.title}</h1>
        <p>{data.product.description}</p>
        <div className="product-meta">
          <span>${data.product.price}</span>
          <span>{data.product.rating.toFixed(1)} rating</span>
        </div>
        <button type="button" onClick={() => navigate("/products")}>
          Back to products
        </button>
      </section>
    </main>
  );
}

function LabPage() {
  const [result, setResult] = useState("Choose a scenario to trigger.");
  const [blank, setBlank] = useState(false);

  const scenarios = useMemo(
    () =>
      [
        {
          label: "Slow product API",
          expected: "performance.api with high duration",
          run: () => runApiScenario({ delay: 2000 })
        },
        {
          label: "Product API 500",
          expected: "error.api",
          run: () => runApiScenario({ status: 500 })
        },
        {
          label: "Large product list",
          expected: "performance.api and list render pressure",
          run: () => runApiScenario({ large: true })
        },
        {
          label: "Malformed data",
          expected: "render error or malformed payload handling",
          run: () => runApiScenario({ malformed: true })
        },
        {
          label: "Broken images",
          expected: "error.resource",
          run: () => runApiScenario({ brokenImage: true })
        }
      ] satisfies Array<{
        label: string;
        expected: string;
        run: () => Promise<string>;
      }>,
    []
  );

  async function runApiScenario(query: ScenarioQuery) {
    const payload = await getProducts(query);

    return `Received ${Array.isArray(payload.products) ? payload.products.length : 0} products.`;
  }

  if (blank) {
    return <main id="shop-root" className="blank-screen" />;
  }

  return (
    <main className="section lab-layout" id="shop-root">
      <div className="section-heading">
        <p className="eyebrow">Fault lab</p>
        <h1>Trigger controlled monitoring scenarios</h1>
        <p>Each action maps to a first-phase monitoring capability.</p>
      </div>

      <div className="scenario-grid">
        {scenarios.map((scenario) => (
          <article className="scenario-card" key={scenario.label}>
            <h3>{scenario.label}</h3>
            <p>{scenario.expected}</p>
            <button
              type="button"
              onClick={() => {
                scenario
                  .run()
                  .then(setResult)
                  .catch((reason: unknown) =>
                    setResult(reason instanceof Error ? reason.message : String(reason))
                  );
              }}
            >
              Trigger
            </button>
          </article>
        ))}

        <article className="scenario-card">
          <h3>JS Runtime Error</h3>
          <p>error.js</p>
          <button
            type="button"
            onClick={() => {
              throw new Error("Manual lab JS runtime error");
            }}
          >
            Trigger
          </button>
        </article>

        <article className="scenario-card">
          <h3>Promise Error</h3>
          <p>error.promise</p>
          <button
            type="button"
            onClick={() => {
              void Promise.reject(new Error("Manual lab promise rejection"));
            }}
          >
            Trigger
          </button>
        </article>

        <article className="scenario-card">
          <h3>Blank Screen</h3>
          <p>error.blank_screen</p>
          <button type="button" onClick={() => setBlank(true)}>
            Trigger
          </button>
        </article>
      </div>

      <div className="state-panel">{result}</div>
    </main>
  );
}

function App() {
  const route = useRoute();

  return (
    <>
      <header className="app-header">
        <button type="button" className="brand" onClick={() => navigate("/")}>
          Mini Shop Monitor
        </button>
        <nav>
          <button type="button" onClick={() => navigate("/")}>
            Home
          </button>
          <button type="button" onClick={() => navigate("/products")}>
            Products
          </button>
          <button type="button" onClick={() => navigate("/lab")}>
            Lab
          </button>
        </nav>
      </header>

      {route.name === "home" && <HomePage />}
      {route.name === "products" && <ProductsPage />}
      {route.name === "detail" && <ProductDetailPage id={route.id} />}
      {route.name === "lab" && <LabPage />}
    </>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
