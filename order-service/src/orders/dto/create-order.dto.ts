import { IsEmail, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderDto {
  @ApiProperty({ example: 1, description: 'Catalog product id (>= 1)' })
  @IsInt()
  @Min(1)
  productId: number;

  @ApiProperty({ example: 2, description: 'Quantity to reserve (>= 1)' })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 'client@test.com', description: 'Recipient email' })
  @IsEmail()
  customerEmail: string;
}
