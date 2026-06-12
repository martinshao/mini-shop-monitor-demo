import { Injectable, OnApplicationShutdown, OnModuleInit } from "@nestjs/common";
import pg from "pg";

const { Pool } = pg;

const DEFAULT_DATABASE_URL =
  "postgres://dev:dev123456@localhost:5432/app_dev";

export type DatabasePool = pg.Pool;

@Injectable()
export class DatabaseProvider implements OnModuleInit, OnApplicationShutdown {
  private readonly pool = new Pool({
    connectionString: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
    ssl: false
  });

  get client() {
    return this.pool;
  }

  async onModuleInit() {
    await this.pool.query("SELECT 1");
  }

  async onApplicationShutdown() {
    await this.pool.end();
  }
}
