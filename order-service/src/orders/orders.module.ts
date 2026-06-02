import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { Order } from './entities/order.entity';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order]),
    ClientsModule.registerAsync([
      {
        name: 'STOCK_GRPC',
        useFactory: () => ({
          transport: Transport.GRPC,
          options: {
            package: 'stock',
            protoPath: join(process.cwd(), 'proto', 'stock.proto'),
            url: process.env.STOCK_GRPC_URL ?? 'localhost:50051',
          },
        }),
      },
      {
        name: 'KAFKA',
        useFactory: () => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'order-service',
              brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
            },
            producer: {
              allowAutoTopicCreation: true,
            },
          },
        }),
      },
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
