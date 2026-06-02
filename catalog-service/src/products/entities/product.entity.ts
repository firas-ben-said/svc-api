import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('products')
export class Product {
  @ApiProperty({ example: 1, description: 'Auto-generated product id' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Laptop' })
  @Column()
  name: string;

  @ApiProperty({ example: 1200, description: 'Strictly positive price' })
  @Column('float')
  price: number;

  @ApiProperty({ example: 10, description: 'Available units (>= 0)' })
  @Column('int')
  stock: number;
}
