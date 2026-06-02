import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientGrpc, ClientKafka } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { Order } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { StockGrpcClient, StockResponse } from './stock.client';

@Injectable()
export class OrdersService implements OnModuleInit {
  private readonly logger = new Logger(OrdersService.name);
  private stock!: StockGrpcClient;

  constructor(
    @InjectRepository(Order)
    private readonly repo: Repository<Order>,
    @Inject('STOCK_GRPC') private readonly stockClient: ClientGrpc,
    @Inject('KAFKA') private readonly kafka: ClientKafka,
  ) {}

  async onModuleInit(): Promise<void> {
    this.stock = this.stockClient.getService<StockGrpcClient>('StockService');
    // Connecting the producer up front avoids paying handshake latency on first publish.
    await this.kafka.connect();
  }

  async create(dto: CreateOrderDto): Promise<Order> {
    // 1. Synchronous stock check + reservation via gRPC.
    //    We need the answer *now* before we can persist the order, so request/response
    //    over gRPC is the right shape (vs. fire-and-forget Kafka).
    let stockResult: StockResponse;
    try {
      stockResult = await firstValueFrom(
        this.stock.checkAndReserve({ productId: dto.productId, quantity: dto.quantity }),
      );
    } catch (err) {
      this.logger.error(`stock-service unreachable: ${(err as Error).message}`);
      throw new ConflictException('stock-service is unavailable');
    }

    if (!stockResult.available) {
      throw new ConflictException(stockResult.message);
    }

    // 2. Persist the order locally.
    const order = await this.repo.save(
      this.repo.create({ ...dto, status: 'CONFIRMED' }),
    );

    // 3. Publish OrderCreated event to Kafka. Notification (and any future consumer)
    //    react asynchronously; the HTTP caller doesn't wait for them.
    this.kafka.emit('order.created', {
      key: String(order.id),
      value: {
        id: order.id,
        productId: order.productId,
        quantity: order.quantity,
        customerEmail: order.customerEmail,
        status: order.status,
        createdAt: new Date().toISOString(),
      },
    });

    this.logger.log(`order ${order.id} created and order.created event emitted`);
    return order;
  }

  findAll(): Promise<Order[]> {
    return this.repo.find({ order: { id: 'ASC' } });
  }

  async findOne(id: number): Promise<Order> {
    const order = await this.repo.findOne({ where: { id } });
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return order;
  }
}
