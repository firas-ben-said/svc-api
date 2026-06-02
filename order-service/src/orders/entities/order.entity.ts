import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export type OrderStatus = 'CONFIRMED' | 'REJECTED';

@Entity('orders')
export class Order {
  @ApiProperty({ example: 1, description: 'Auto-generated order id' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 1, description: 'Catalog product id' })
  @Column('int')
  productId: number;

  @ApiProperty({ example: 2, description: 'Units ordered' })
  @Column('int')
  quantity: number;

  @ApiProperty({ example: 'client@test.com' })
  @Column()
  customerEmail: string;

  @ApiProperty({ example: 'CONFIRMED', enum: ['CONFIRMED', 'REJECTED'] })
  @Column({ default: 'CONFIRMED' })
  status: OrderStatus;
}
