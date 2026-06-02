import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Order } from './order.model';

@Resolver(() => Order)
export class OrdersResolver {
  private readonly orderUrl = process.env.ORDER_URL ?? 'http://localhost:3002';

  constructor(private readonly http: HttpService) {}

  @Query(() => [Order])
  async orders(): Promise<Order[]> {
    const res = await firstValueFrom(
      this.http.get<Order[]>(`${this.orderUrl}/orders`),
    );
    return res.data;
  }

  @Query(() => Order, { nullable: true })
  async orderById(@Args('id', { type: () => ID }) id: number): Promise<Order | null> {
    try {
      const res = await firstValueFrom(
        this.http.get<Order>(`${this.orderUrl}/orders/${id}`),
      );
      return res.data;
    } catch (err: any) {
      if (err?.response?.status === 404) return null;
      throw err;
    }
  }
}
