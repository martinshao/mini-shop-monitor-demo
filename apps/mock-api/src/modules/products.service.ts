import { HttpException, Injectable, NotFoundException } from "@nestjs/common";
import type {
  FaultScenario,
  HomePayload,
  Product,
  ProductDetailPayload,
  ProductListPayload
} from "@mini-shop-monitor/shared";
import { ProductsRepository } from "./products.repository.js";

const PORT = Number(process.env.PORT ?? 4100);

export type ScenarioQuery = {
  delay?: string | number;
  status?: string | number;
  large?: string | boolean;
  brokenImage?: string | boolean;
  malformed?: string | boolean;
};

@Injectable()
export class ProductsService {
  constructor(private readonly productsRepository: ProductsRepository) {}

  async getHome(query: ScenarioQuery): Promise<HomePayload | Record<string, null>> {
    const scenario = parseFaultScenario(query);

    await sleep(scenario.delayMs);
    assertSuccessStatus(query.status, "home");

    const products = createScenarioProducts(
      await this.productsRepository.findAll(),
      scenario
    ).slice(0, 3);

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

  async getProducts(query: ScenarioQuery): Promise<ProductListPayload | Record<string, string>> {
    const scenario = parseFaultScenario(query);

    await sleep(scenario.delayMs);
    assertSuccessStatus(query.status, "product list");

    const products = createScenarioProducts(
      await this.productsRepository.findAll(),
      scenario
    );
    const payload: ProductListPayload = {
      products,
      total: products.length,
      scenario
    };

    return scenario.malformed ? { products: "unexpected-shape" } : payload;
  }

  async getProductDetail(
    id: string,
    query: ScenarioQuery
  ): Promise<ProductDetailPayload | Record<string, null>> {
    const scenario = parseFaultScenario(query);

    await sleep(scenario.delayMs);
    assertSuccessStatus(query.status, "product detail");

    const product = await this.productsRepository.findById(id);

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    const relatedProducts = createScenarioProducts(
      await this.productsRepository.findAll(),
      scenario
    )
      .filter((item) => item.id !== product.id)
      .slice(0, 3);
    const payload: ProductDetailPayload = {
      product: applyBrokenImage(product, scenario, 0),
      relatedProducts,
      scenario
    };

    return scenario.malformed ? { product: null } : payload;
  }
}

function parseFaultScenario(query: ScenarioQuery): FaultScenario {
  return {
    delayMs: Number(query.delay ?? 0),
    large: isEnabled(query.large),
    brokenImage: isEnabled(query.brokenImage),
    malformed: isEnabled(query.malformed)
  };
}

function isEnabled(value: unknown) {
  return value === true || value === "1" || value === "true";
}

function createScenarioProducts(products: Product[], scenario: FaultScenario) {
  const scenarioProducts = scenario.large
    ? Array.from({ length: 80 }, (_, index) => {
        const source = products[index % products.length];

        return {
          ...source,
          id: `${source.id}-${index + 1}`,
          title: `${source.title} ${index + 1}`
        };
      })
    : products;

  return scenarioProducts.map((product, index) =>
    applyBrokenImage(product, scenario, index)
  );
}

function applyBrokenImage(
  product: Product,
  scenario: FaultScenario,
  index: number
) {
  if (!scenario.brokenImage || index % 3 !== 0) {
    return product;
  }

  return {
    ...product,
    imageUrl: `http://localhost:${PORT}/assets/missing-${product.id}.png`
  };
}

function statusFromQuery(status: ScenarioQuery["status"]) {
  const statusCode = Number(status ?? 200);

  return Number.isFinite(statusCode) ? statusCode : 200;
}

function assertSuccessStatus(status: ScenarioQuery["status"], scope: string) {
  const statusCode = statusFromQuery(status);

  if (statusCode >= 400) {
    throw new HttpException(`Forced ${scope} API status ${statusCode}`, statusCode);
  }
}

function sleep(delayMs: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, delayMs));
  });
}
