import cors from "@fastify/cors";
import Fastify from "fastify";
import type {
  FaultScenario,
  HomePayload,
  Product,
  ProductDetailPayload,
  ProductListPayload
} from "@mini-shop-monitor/shared";

const PORT = 4100;

export const mockProducts: Product[] = [
  {
    id: "p-1001",
    title: "Monitor Demo Hoodie",
    subtitle: "Large image and product card rendering sample",
    category: "apparel",
    price: 129,
    rating: 4.8,
    imageUrl: "https://picsum.photos/seed/monitor-hoodie/900/680",
    description:
      "A soft hoodie used by the demo shop to validate image loading and product detail rendering."
  },
  {
    id: "p-1002",
    title: "Frontend Observability Mug",
    subtitle: "Small product with stable resources",
    category: "drinkware",
    price: 39,
    rating: 4.6,
    imageUrl: "https://picsum.photos/seed/monitor-mug/900/680",
    description:
      "A desk mug for validating product list rendering, detail requests, and card layout stability."
  },
  {
    id: "p-1003",
    title: "Synthetic Traffic Cap",
    subtitle: "Useful for resource timing experiments",
    category: "accessory",
    price: 59,
    rating: 4.4,
    imageUrl: "https://picsum.photos/seed/monitor-cap/900/680",
    description:
      "A lightweight accessory used to create repeatable image requests in the shop sandbox."
  },
  {
    id: "p-1004",
    title: "Local Trace Speaker",
    subtitle: "Device sample for malformed detail payloads",
    category: "device",
    price: 249,
    rating: 4.7,
    imageUrl: "https://picsum.photos/seed/monitor-speaker/900/680",
    description:
      "A compact device card that makes the product grid feel realistic without adding checkout scope."
  }
];

function parseFaultScenario(query: Record<string, unknown>): FaultScenario {
  return {
    delayMs: Number(query.delay ?? 0),
    large: query.large === "1" || query.large === "true",
    brokenImage: query.brokenImage === "1" || query.brokenImage === "true",
    malformed: query.malformed === "1" || query.malformed === "true"
  };
}

function createProducts(scenario: FaultScenario) {
  const products = scenario.large
    ? Array.from({ length: 80 }, (_, index) => {
        const source = mockProducts[index % mockProducts.length];

        return {
          ...source,
          id: `${source.id}-${index + 1}`,
          title: `${source.title} ${index + 1}`
        };
      })
    : mockProducts;

  if (!scenario.brokenImage) {
    return products;
  }

  return products.map((product, index) => ({
    ...product,
    imageUrl:
      index % 3 === 0
        ? `http://localhost:${PORT}/assets/missing-${product.id}.png`
        : product.imageUrl
  }));
}

function sleep(delayMs: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, delayMs));
  });
}

function statusFromQuery(query: Record<string, unknown>) {
  const status = Number(query.status ?? 200);

  return Number.isFinite(status) ? status : 200;
}

export function createMockApiApp() {
  const app = Fastify({
    logger: true
  });

  app.register(cors, {
    origin: true
  });

  app.get("/api/health", async () => ({
    ok: true,
    service: "mock-api"
  }));

  app.get<{ Querystring: Record<string, unknown> }>(
    "/api/home",
    async (request, reply) => {
      const scenario = parseFaultScenario(request.query);
      const status = statusFromQuery(request.query);

      await sleep(scenario.delayMs);

      if (status >= 400) {
        return reply.code(status).send({
          message: `Forced home API status ${status}`
        });
      }

      const products = createProducts(scenario).slice(0, 3);
      const payload: HomePayload = {
        heroTitle: "Monitor Lab Shop",
        heroSubtitle: "A lightweight C-side storefront for monitoring scenarios.",
        heroImageUrl: scenario.brokenImage
          ? `http://localhost:${PORT}/assets/missing-hero.png`
          : "https://picsum.photos/seed/monitor-hero/1400/800",
        featuredProducts: products
      };

      return scenario.malformed ? { payload: null } : payload;
    }
  );

  app.get<{ Querystring: Record<string, unknown> }>(
    "/api/products",
    async (request, reply) => {
      const scenario = parseFaultScenario(request.query);
      const status = statusFromQuery(request.query);

      await sleep(scenario.delayMs);

      if (status >= 400) {
        return reply.code(status).send({
          message: `Forced product list API status ${status}`
        });
      }

      const products = createProducts(scenario);
      const payload: ProductListPayload = {
        products,
        total: products.length,
        scenario
      };

      return scenario.malformed ? { products: "unexpected-shape" } : payload;
    }
  );

  app.get<{ Params: { id: string }; Querystring: Record<string, unknown> }>(
    "/api/products/:id",
    async (request, reply) => {
      const scenario = parseFaultScenario(request.query);
      const status = statusFromQuery(request.query);

      await sleep(scenario.delayMs);

      if (status >= 400) {
        return reply.code(status).send({
          message: `Forced product detail API status ${status}`
        });
      }

      const product = createProducts(scenario).find((item) =>
        item.id.startsWith(request.params.id)
      );

      if (!product) {
        return reply.code(404).send({
          message: "Product not found"
        });
      }

      const payload: ProductDetailPayload = {
        product,
        relatedProducts: createProducts(scenario)
          .filter((item) => item.id !== product.id)
          .slice(0, 3),
        scenario
      };

      return scenario.malformed ? { product: null } : payload;
    }
  );

  return app;
}

const app = createMockApiApp();

app.listen({ port: PORT, host: "0.0.0.0" }).catch((error: unknown) => {
  app.log.error(error);
  throw error;
});
