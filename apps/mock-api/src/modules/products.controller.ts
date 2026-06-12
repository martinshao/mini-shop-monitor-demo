import { Controller, Get, Param, Query } from "@nestjs/common";
import { ProductsService, type ScenarioQuery } from "./products.service.js";

@Controller("api")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get("home")
  getHome(@Query() query: ScenarioQuery) {
    return this.productsService.getHome(query);
  }

  @Get("products")
  getProducts(@Query() query: ScenarioQuery) {
    return this.productsService.getProducts(query);
  }

  @Get("products/:id")
  getProductDetail(
    @Param("id") id: string,
    @Query() query: ScenarioQuery
  ) {
    return this.productsService.getProductDetail(id, query);
  }
}
