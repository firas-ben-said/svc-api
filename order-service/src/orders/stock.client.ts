import { Observable } from 'rxjs';

export interface StockRequest {
  productId: number;
  quantity: number;
}

export interface StockResponse {
  available: boolean;
  message: string;
}

// gRPC client stub. The method name follows the proto definition (CheckAndReserve);
// @nestjs/microservices lowercases the first letter when generating the client method.
export interface StockGrpcClient {
  checkAndReserve(req: StockRequest): Observable<StockResponse>;
}
