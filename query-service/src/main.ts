import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Swagger documents the small REST surface (just `/api/info`). The actual
  // API is GraphQL at `/graphql` — Apollo Sandbox is the schema explorer for
  // queries, mutations, and types.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('query-service')
    .setDescription(
      'GraphQL aggregator over catalog-service and order-service (via REST). ' +
        'The primary API is GraphQL at `/graphql`; this Swagger UI only ' +
        'documents the auxiliary REST info endpoint.',
    )
    .setVersion('0.1.0')
    .addTag('info')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = Number(process.env.QUERY_PORT ?? 3003);
  await app.listen(port);
  Logger.log(
    `query-service ready: GraphQL at http://localhost:${port}/graphql`,
    'Bootstrap',
  );
  Logger.log(`Swagger UI:        http://localhost:${port}/api/docs`, 'Bootstrap');
}
bootstrap();
