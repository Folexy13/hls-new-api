import { injectable, inject } from 'inversify';
import { CreateSupplementDTO, UpdateSupplementDTO, WholesalerPriceDTO } from '../DTOs/supplement.dto';
import { Prisma, type Supplement } from '@prisma/client';
import { AppError } from '../utilities/errors';
import { SupplementRepository } from '../repositories/supplement.repository';

@injectable()
export class SupplementService {  constructor(@inject(SupplementRepository) private supplementRepository: SupplementRepository) {}
  private toNullableJson(value: unknown) {
    if (value === undefined) return undefined;
    if (value === null) return Prisma.DbNull;
    return value as Prisma.InputJsonValue;
  }

  private toNullableDate(value?: string | null) {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    return new Date(value);
  }
  
  async findAll(page: number = 1, limit: number = 20, userId?: number, userRole?: string): Promise<{ supplements: Supplement[]; total: number }> {
    const skip = (page - 1) * limit;
    const result = await this.supplementRepository.findAll(skip, limit, userId, userRole);
    return { supplements: result.items, total: result.total };
  }

  async findHlsGallery(page: number = 1, limit: number = 100): Promise<{ supplements: Supplement[]; total: number }> {
    const skip = (page - 1) * limit;
    const result = await this.supplementRepository.findHlsGallery(skip, limit);
    return { supplements: result.items, total: result.total };
  }

  async findById(id: number): Promise<Supplement | null> {
    return this.supplementRepository.findById(id);
  }

  async findByUserId(userId: number): Promise<Supplement[]> {
    return this.supplementRepository.findByUserId(userId);
  }

  async findByNameAndBrand(name: string, brand: string): Promise<Supplement[]> {
    return this.supplementRepository.findByNameAndBrand(name, brand);
  }

  async create(userId: number, data: CreateSupplementDTO): Promise<Supplement> {
    return this.supplementRepository.create({
      name: data.name,
      description: data.description,
      rating: data.rating ?? null,
      price: data.price,
      stock: data.stock,
      userId,
      imageUrl: data.imageUrl ?? null,
      category: data.category ?? null,
      manufacturer: data.manufacturer ?? null,
      strength: data.strength ?? null,
      expiryDate: this.toNullableDate(data.expiryDate),
      dosageForm: data.dosageForm ?? null,
      budgetRange: data.budgetRange ?? null,
      tags: this.toNullableJson(data.tags),
      wholesalers: this.toNullableJson(data.wholesalers),
      status: data.status ?? 'in_stock',
    });
  }

  async saveWholesalerPrice(
    supplementId: number,
    wholesaler: { id: number; email: string },
    data: WholesalerPriceDTO,
  ): Promise<Supplement> {
    const supplement = await this.findById(supplementId);
    if (!supplement) {
      throw new AppError('Supplement not found', 404);
    }

    const existingWholesalers = Array.isArray((supplement as any).wholesalers)
      ? ((supplement as any).wholesalers as any[])
      : [];

    const nextWholesalers = existingWholesalers.filter((item) => {
      const id = Number(item?.wholesalerUserId || 0);
      const email = String(item?.email || '').toLowerCase();
      return id !== wholesaler.id && email !== wholesaler.email.toLowerCase();
    });

    nextWholesalers.push({
      wholesalerUserId: wholesaler.id,
      name: wholesaler.email,
      email: wholesaler.email,
      price: data.price,
      contact: data.contact || wholesaler.email,
      address: data.address || '',
      updatedAt: new Date().toISOString(),
    });

    await this.supplementRepository.update(supplementId, {
      wholesalers: this.toNullableJson(nextWholesalers),
    });

    const ownedProduct = await this.supplementRepository.findOwnedProductByName(
      wholesaler.id,
      supplement.name,
      supplement.manufacturer,
    );

    const productData = {
      name: supplement.name,
      description: supplement.description,
      rating: supplement.rating ?? null,
      price: data.price,
      stock: supplement.stock,
      imageUrl: supplement.imageUrl ?? null,
      category: supplement.category ?? null,
      manufacturer: supplement.manufacturer ?? null,
      strength: supplement.strength ?? null,
      expiryDate: supplement.expiryDate ?? null,
      dosageForm: supplement.dosageForm ?? null,
      budgetRange: supplement.budgetRange ?? null,
      tags: this.toNullableJson(supplement.tags),
      wholesalers: this.toNullableJson([{
        wholesalerUserId: wholesaler.id,
        name: wholesaler.email,
        email: wholesaler.email,
        price: data.price,
        contact: data.contact || wholesaler.email,
        address: data.address || '',
        sourceSupplementId: supplement.id,
        updatedAt: new Date().toISOString(),
      }]),
      status: supplement.status ?? 'in_stock',
    };

    if (ownedProduct) {
      return this.supplementRepository.update(ownedProduct.id, productData);
    }

    return this.supplementRepository.create({
      ...productData,
      userId: wholesaler.id,
    });
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

    return this.supplementRepository.update(id, {
      name: data.name,
      description: data.description,
      rating: data.rating,
      price: data.price,
      stock: data.stock,
      imageUrl: data.imageUrl,
      category: data.category,
      manufacturer: data.manufacturer,
      strength: data.strength,
      expiryDate: this.toNullableDate(data.expiryDate),
      dosageForm: data.dosageForm,
      budgetRange: data.budgetRange,
      tags: this.toNullableJson(data.tags),
      wholesalers: this.toNullableJson(data.wholesalers),
      status: data.status,
    });
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

  async search(query: string, brand?: string): Promise<Supplement[]> {
    return this.supplementRepository.search(query, brand);
  }
}
