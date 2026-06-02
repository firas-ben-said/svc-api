import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const brokers = (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(',');

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'notification-service',
        brokers,
      },
      consumer: {
        // Stable consumer group keeps offsets across restarts and would let us
        // scale this service horizontally (each partition consumed by one instance).
        groupId: 'notification-consumer',
      },
      subscribe: {
        // Read from the earliest available offset on first join, so we pick up
        // any events that landed before the consumer finished subscribing
        // (common when Kafka auto-creates the topic on first publish).
        fromBeginning: true,
      },
    },
  });

  await app.listen();
  Logger.log(
    `notification-service consuming Kafka brokers=${brokers.join(',')}`,
    'Bootstrap',
  );
}
bootstrap();
