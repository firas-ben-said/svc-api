import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('info')
@Controller()
export class InfoController {
  @Get('api/info')
  @ApiOperation({
    summary: 'Service info — points clients at the real GraphQL endpoint',
    description:
      'query-service exposes a single GraphQL endpoint at `/graphql`. ' +
      'Use that for queries; this endpoint is just metadata.',
  })
  @ApiOkResponse({
    schema: {
      example: {
        name: 'query-service',
        transport: 'GraphQL (Apollo) over HTTP',
        endpoints: {
          graphql: '/graphql',
          sandbox: '/graphql',
          swagger: '/api/docs',
        },
        queries: ['products', 'orders', 'orderById(id: ID!)'],
      },
    },
  })
  info() {
    return {
      name: 'query-service',
      transport: 'GraphQL (Apollo) over HTTP',
      endpoints: {
        graphql: '/graphql',
        sandbox: '/graphql',
        swagger: '/api/docs',
      },
      queries: ['products', 'orders', 'orderById(id: ID!)'],
    };
  }
}
