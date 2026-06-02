import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiParam,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './entities/order.entity';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  @ApiOperation({
    summary: 'Create an order (REST → gRPC stock check → Kafka emit)',
    description:
      'Calls stock-service over gRPC to reserve units; on success persists ' +
      'the order and publishes an `order.created` event to Kafka.',
  })
  @ApiCreatedResponse({ type: Order })
  @ApiBadRequestResponse({ description: 'DTO validation failed' })
  @ApiConflictResponse({
    description: 'Insufficient stock, or stock-service unreachable',
  })
  create(@Body() dto: CreateOrderDto) {
    return this.orders.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all orders' })
  @ApiOkResponse({ type: [Order] })
  findAll() {
    return this.orders.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one order by id' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiOkResponse({ type: Order })
  @ApiNotFoundResponse({ description: 'Order not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.orders.findOne(id);
  }
}
