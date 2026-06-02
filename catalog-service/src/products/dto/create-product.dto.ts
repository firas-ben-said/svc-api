import { IsInt, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'Laptop', description: 'Non-empty product name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 1200, description: 'Strictly positive price' })
  @IsNumber()
  @Min(0.01, { message: 'price must be strictly positive' })
  price: number;

  @ApiProperty({ example: 10, description: 'Initial stock (>= 0)' })
  @IsInt()
  @Min(0, { message: 'stock must be non-negative' })
  stock: number;
}
