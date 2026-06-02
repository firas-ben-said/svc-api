import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('order-service')
    .setDescription(
      'REST API for order creation and tracking. Each `POST /orders` triggers ' +
        'a synchronous gRPC stock reservation and an async Kafka `order.created` event.',
    )
    .setVersion('0.1.0')
    .addTag('orders')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = Number(process.env.ORDER_PORT ?? 3002);
  await app.listen(port);
  Logger.log(`order-service ready on http://localhost:${port}`, 'Bootstrap');
  Logger.log(`Swagger UI:      http://localhost:${port}/api/docs`, 'Bootstrap');
}
bootstrap();
