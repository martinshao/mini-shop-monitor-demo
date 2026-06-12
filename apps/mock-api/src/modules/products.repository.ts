import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import type { Product, ProductCategory } from "@mini-shop-monitor/shared";
import { DatabaseProvider } from "../shared/database.provider.js";

type ProductRow = {
  id: string;
  title: string;
  subtitle: string;
  category: ProductCategory;
  price: string;
  rating: string;
  image_url: string;
  description: string;
};

const SEED_PRODUCTS: Product[] = [
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

@Injectable()
export class ProductsRepository implements OnModuleInit {
  constructor(
    @Inject(DatabaseProvider)
    private readonly database: DatabaseProvider
  ) {}

  async onModuleInit() {
    await this.ensureSchema();
    await this.seedProducts();
  }

  async findAll() {
    const result = await this.database.client.query<ProductRow>(
      `
        SELECT *
        FROM shop_products
        WHERE is_active = TRUE
        ORDER BY sort_order ASC, id ASC
      `
    );

    return result.rows.map(mapProductRow);
  }

  async findById(id: string) {
    const result = await this.database.client.query<ProductRow>(
      `
        SELECT *
        FROM shop_products
        WHERE id = $1
          AND is_active = TRUE
        LIMIT 1
      `,
      [id]
    );

    return result.rows[0] ? mapProductRow(result.rows[0]) : null;
  }

  private async ensureSchema() {
    await this.database.client.query(`
      CREATE TABLE IF NOT EXISTS shop_products (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        subtitle TEXT NOT NULL,
        category TEXT NOT NULL,
        price NUMERIC(12, 2) NOT NULL,
        rating NUMERIC(3, 1) NOT NULL,
        image_url TEXT NOT NULL,
        description TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_shop_products_active_sort
        ON shop_products (is_active, sort_order, id);
    `);
  }

  private async seedProducts() {
    await Promise.all(
      SEED_PRODUCTS.map((product, index) =>
        this.database.client.query(
          `
            INSERT INTO shop_products (
              id,
              title,
              subtitle,
              category,
              price,
              rating,
              image_url,
              description,
              sort_order
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (id) DO NOTHING
          `,
          [
            product.id,
            product.title,
            product.subtitle,
            product.category,
            product.price,
            product.rating,
            product.imageUrl,
            product.description,
            index + 1
          ]
        )
      )
    );
  }
}

function mapProductRow(row: ProductRow): Product {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    category: row.category,
    price: Number(row.price),
    rating: Number(row.rating),
    imageUrl: row.image_url,
    description: row.description
  };
}
