import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { StockService } from './stock.service';

interface StockRequest {
  productId: number;
  quantity: number;
}

interface StockResponse {
  available: boolean;
  message: string;
}

@Controller()
export class StockController {
  private readonly logger = new Logger(StockController.name);

  constructor(private readonly stock: StockService) {}

  @GrpcMethod('StockService', 'CheckAndReserve')
  checkAndReserve(req: StockRequest): StockResponse {
    this.logger.log(`gRPC CheckAndReserve productId=${req.productId} qty=${req.quantity}`);
    return this.stock.checkAndReserve(Number(req.productId), Number(req.quantity));
  }
}
