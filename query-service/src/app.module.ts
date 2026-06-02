import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { HttpModule } from '@nestjs/axios';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { join } from 'path';
import { ProductsResolver } from './products/products.resolver';
import { OrdersResolver } from './orders/orders.resolver';
import { InfoController } from './info.controller';

@Module({
  imports: [
    HttpModule.register({ timeout: 5_000 }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      // Code-first: generate the schema from the @ObjectType / @Resolver decorators.
      autoSchemaFile: join(process.cwd(), 'query-service', 'schema.gql'),
      sortSchema: true,
      // `playground: false` disables the legacy GraphQL Playground *and* Apollo's
      // default landing page, so browsers visiting /graphql get 406. Re-enable
      // the v5 Apollo Sandbox explicitly so the UI shows up in a browser.
      playground: false,
      plugins: [ApolloServerPluginLandingPageLocalDefault({ embed: true })],
      // Apollo v5 CSRF guard rejects POSTs whose content-type is text/plain /
      // form-urlencoded / multipart. Disabled for the lab so curl, browsers,
      // and Postman defaults can hit /graphql painlessly.
      csrfPrevention: false,
      introspection: true,
    }),
  ],
  controllers: [InfoController],
  providers: [ProductsResolver, OrdersResolver],
})
export class AppModule {}
