import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'Laptop Pro' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 1499.99 })
  @IsOptional()
  @IsNumber()
  @Min(0.01, { message: 'price must be strictly positive' })
  price?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(0, { message: 'stock must be non-negative' })
  stock?: number;
}
