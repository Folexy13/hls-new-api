import { injectable, inject } from 'inversify';
import { NutrientTypeRepository } from '../repositories/nutrienttype.repository';
import { CreateNutrientTypeDTO, UpdateNutrientTypeDTO } from '../DTOs/nutrienttype.dto';

@injectable()
export class NutrientTypeService {
  constructor(
    @inject(NutrientTypeRepository) private nutrientTypeRepository: NutrientTypeRepository
  ) {}

  async findAll(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const result = await this.nutrientTypeRepository.findAll(skip, limit);
    return { nutrientTypes: result.items, total: result.total };
  }

  async findById(id: number) {
    return this.nutrientTypeRepository.findById(id);
  }

  async findByCode(code: string) {
    return this.nutrientTypeRepository.findByCode(code);
  }

  async findByUserId(userId: number) {
    return this.nutrientTypeRepository.findByUserId(userId);
  }

  async create(userId: number, data: CreateNutrientTypeDTO) {
    // Accept nested basic, lifestyle, preference objects
    const { basic, lifestyle, preference, ...rest } = data;
    return this.nutrientTypeRepository.createWithNested({
      ...rest,
      userId,
      basic,
      lifestyle,
      preference,
    });
  }

  async update(id: number, userId: number, data: UpdateNutrientTypeDTO) {
    const nutrientType = await this.findById(id);
    if (!nutrientType) throw new Error('NutrientType not found');
    if (nutrientType.userId !== userId) throw new Error('Unauthorized');
    return this.nutrientTypeRepository.update(id, data);
  }

  async delete(id: number, userId: number) {
    const nutrientType = await this.findById(id);
    if (!nutrientType) throw new Error('NutrientType not found');
    if (nutrientType.userId !== userId) throw new Error('Unauthorized');
    return this.nutrientTypeRepository.delete(id);
  }
}
