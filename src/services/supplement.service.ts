import { injectable, inject } from 'inversify';
import { CreateSupplementDTO, UpdateSupplementDTO } from '../DTOs/supplement.dto';
import type { Supplement } from '.prisma/client';
import { AppError } from '../utilities/errors';
import { SupplementRepository } from '../repositories/supplement.repository';

@injectable()
export class SupplementService {
  constructor(@inject(SupplementRepository) private supplementRepository: SupplementRepository) {}
  async findAll(page: number = 1, limit: number = 10): Promise<{ supplements: Supplement[]; total: number }> {
    const skip = (page - 1) * limit;
    return this.supplementRepository.findAll(skip, limit);
  }

  async findById(id: number): Promise<Supplement | null> {
    return this.supplementRepository.findById(id);
  }

  async findByUserId(userId: number): Promise<Supplement[]> {
    return this.supplementRepository.findByUserId(userId);
  }

  async create(userId: number, data: CreateSupplementDTO): Promise<Supplement> {
    return this.supplementRepository.create({ ...data, userId });
  }

  async update(id: number, userId: number, data: UpdateSupplementDTO): Promise<Supplement> {
    const supplement = await this.findById(id);
    
    if (!supplement) {
      throw new AppError('Supplement not found', 404);
    }

    // Ensure user owns the supplement
    if (supplement.userId !== userId) {
      throw new AppError('Unauthorized', 403);
    }

    return this.supplementRepository.update(id, data);
  }

  async delete(id: number, userId: number): Promise<void> {
    const supplement = await this.findById(id);
    
    if (!supplement) {
      throw new AppError('Supplement not found', 404);
    }

    // Ensure user owns the supplement
    if (supplement.userId !== userId) {
      throw new AppError('Unauthorized', 403);
    }

    // Check if supplement is in any cart
    const isInCart = await this.supplementRepository.isInCart(id);
    if (isInCart) {
      throw new AppError('Cannot delete supplement that is in carts', 400);
    }

    await this.supplementRepository.delete(id);
  }

  async updateStock(id: number, quantity: number): Promise<Supplement> {
    const supplement = await this.findById(id);
    
    if (!supplement) {
      throw new AppError('Supplement not found', 404);
    }

    if (supplement.stock < quantity) {
      throw new AppError('Insufficient stock', 400);
    }

    return this.supplementRepository.updateStock(id, quantity);
  }

  async search(query: string): Promise<Supplement[]> {
    return this.supplementRepository.search(query);
  }
}
