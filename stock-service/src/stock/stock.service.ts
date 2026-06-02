import { Injectable, Logger } from '@nestjs/common';

interface StockResponse {
  available: boolean;
  message: string;
}

@Injectable()
export class StockService {
  private readonly logger = new Logger(StockService.name);

  // In-memory stock keyed by productId — mirrors the seed data from catalog-service.
  // Real implementations would share a database or subscribe to catalog events.
  private readonly stock = new Map<number, number>([
    [1, 10],
    [2, 25],
    [3, 0],
  ]);

  checkAndReserve(productId: number, quantity: number): StockResponse {
    if (quantity <= 0) {
      return { available: false, message: 'quantity must be strictly positive' };
    }

    const current = this.stock.get(productId);
    if (current === undefined) {
      return { available: false, message: `unknown product ${productId}` };
    }
    if (current < quantity) {
      return {
        available: false,
        message: `insufficient stock for product ${productId} (have ${current}, need ${quantity})`,
      };
    }

    this.stock.set(productId, current - quantity);
    this.logger.log(
      `reserved ${quantity}x product ${productId}; remaining=${this.stock.get(productId)}`,
    );
    return { available: true, message: 'reserved' };
  }
}
