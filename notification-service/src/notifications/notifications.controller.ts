import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';

interface OrderCreatedEvent {
  id: number;
  productId: number;
  quantity: number;
  customerEmail: string;
  status: string;
  createdAt: string;
}

@Controller()
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  // @EventPattern subscribes us to the topic without producing a reply, which is
  // the natural shape for fan-out events (vs. @MessagePattern which expects a response).
  @EventPattern('order.created')
  handleOrderCreated(@Payload() event: OrderCreatedEvent): void {
    const timestamp = new Date().toISOString();
    this.logger.log(
      `[${timestamp}] order.created received: ${JSON.stringify(event)}`,
    );
    // Simulate an email send. In production this would call an SMTP provider.
    this.logger.log(
      `confirmation sent to ${event.customerEmail} for order ${event.id}`,
    );
  }
}
