import { Resolver, Query } from '@nestjs/graphql';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Product } from './product.model';

@Resolver(() => Product)
export class ProductsResolver {
  private readonly catalogUrl =
    process.env.CATALOG_URL ?? 'http://localhost:3001';

  constructor(private readonly http: HttpService) {}

  @Query(() => [Product])
  async products(): Promise<Product[]> {
    const res = await firstValueFrom(
      this.http.get<Product[]>(`${this.catalogUrl}/products`),
    );
    return res.data;
  }
}
