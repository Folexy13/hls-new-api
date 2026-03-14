"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NutrientTypeService = void 0;
const inversify_1 = require("inversify");
const nutrienttype_repository_1 = require("../repositories/nutrienttype.repository");
let NutrientTypeService = class NutrientTypeService {
    constructor(nutrientTypeRepository) {
        this.nutrientTypeRepository = nutrientTypeRepository;
    }
    async findAll(page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const result = await this.nutrientTypeRepository.findAll(skip, limit);
        return { nutrientTypes: result.items, total: result.total };
    }
    async findById(id) {
        return this.nutrientTypeRepository.findById(id);
    }
    async findByCode(code) {
        return this.nutrientTypeRepository.findByCode(code);
    }
    async findByUserId(userId) {
        return this.nutrientTypeRepository.findByUserId(userId);
    }
    async create(userId, data) {
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
    async update(id, userId, data) {
        const nutrientType = await this.findById(id);
        if (!nutrientType)
            throw new Error('NutrientType not found');
        if (nutrientType.userId !== userId)
            throw new Error('Unauthorized');
        return this.nutrientTypeRepository.update(id, data);
    }
    async delete(id, userId) {
        const nutrientType = await this.findById(id);
        if (!nutrientType)
            throw new Error('NutrientType not found');
        if (nutrientType.userId !== userId)
            throw new Error('Unauthorized');
        return this.nutrientTypeRepository.delete(id);
    }
};
exports.NutrientTypeService = NutrientTypeService;
exports.NutrientTypeService = NutrientTypeService = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(nutrienttype_repository_1.NutrientTypeRepository)),
    __metadata("design:paramtypes", [nutrienttype_repository_1.NutrientTypeRepository])
], NutrientTypeService);
//# sourceMappingURL=nutrienttype.service.js.map