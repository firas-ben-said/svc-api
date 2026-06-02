import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('catalog-service')
    .setDescription('REST API for product catalog (CRUD over Postgres).')
    .setVersion('0.1.0')
    .addTag('products')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = Number(process.env.CATALOG_PORT ?? 3001);
  await app.listen(port);
  Logger.log(`catalog-service ready on http://localhost:${port}`, 'Bootstrap');
  Logger.log(`Swagger UI:        http://localhost:${port}/api/docs`, 'Bootstrap');
}
bootstrap();
