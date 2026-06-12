import { Module } from "@nestjs/common";
import { DatabaseProvider } from "../shared/database.provider.js";
import { HealthController } from "./health.controller.js";
import { ProductsController } from "./products.controller.js";
import { ProductsRepository } from "./products.repository.js";
import { ProductsService } from "./products.service.js";

@Module({
  controllers: [HealthController, ProductsController],
  providers: [DatabaseProvider, ProductsRepository, ProductsService]
})
export class AppModule {}
