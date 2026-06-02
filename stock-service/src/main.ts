import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const url = process.env.STOCK_GRPC_URL ?? '0.0.0.0:50051';
  const protoPath = join(process.cwd(), 'proto', 'stock.proto');

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.GRPC,
    options: {
      package: 'stock',
      protoPath,
      url,
    },
  });

  await app.listen();
  Logger.log(`stock-service gRPC server listening on ${url}`, 'Bootstrap');
}
bootstrap();
