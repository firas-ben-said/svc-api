import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService implements OnModuleInit {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectRepository(Product)
    private readonly repo: Repository<Product>,
  ) {}

  async onModuleInit(): Promise<void> {
    const count = await this.repo.count();
    if (count === 0) {
      await this.repo.save([
        this.repo.create({ name: 'Laptop', price: 1200, stock: 10 }),
        this.repo.create({ name: 'Mechanical Keyboard', price: 150, stock: 25 }),
        this.repo.create({ name: 'USB-C Hub', price: 45, stock: 0 }),
      ]);
      this.logger.log('Seeded catalog with 3 starter products');
    }
  }

  create(dto: CreateProductDto): Promise<Product> {
    return this.repo.save(this.repo.create(dto));
  }

  findAll(): Promise<Product[]> {
    return this.repo.find({ order: { id: 'ASC' } });
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.repo.findOne({ where: { id } });
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }

  async update(id: number, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);
    Object.assign(product, dto);
    return this.repo.save(product);
  }

  async remove(id: number): Promise<void> {
    const result = await this.repo.delete(id);
    if (!result.affected) throw new NotFoundException(`Product ${id} not found`);
  }
}
