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
exports.SupplementService = void 0;
const inversify_1 = require("inversify");
const errors_1 = require("../utilities/errors");
const supplement_repository_1 = require("../repositories/supplement.repository");
let SupplementService = class SupplementService {
    constructor(supplementRepository) {
        this.supplementRepository = supplementRepository;
    }
    async findAll(page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const result = await this.supplementRepository.findAll(skip, limit);
        return { supplements: result.items, total: result.total };
    }
    async findById(id) {
        return this.supplementRepository.findById(id);
    }
    async findByUserId(userId) {
        return this.supplementRepository.findByUserId(userId);
    }
    async create(userId, data) {
        return this.supplementRepository.create({ ...data, userId });
    }
    async update(id, userId, data) {
        const supplement = await this.findById(id);
        if (!supplement) {
            throw new errors_1.AppError('Supplement not found', 404);
        }
        // Ensure user owns the supplement
        if (supplement.userId !== userId) {
            throw new errors_1.AppError('Unauthorized', 403);
        }
        return this.supplementRepository.update(id, data);
    }
    async delete(id, userId) {
        const supplement = await this.findById(id);
        if (!supplement) {
            throw new errors_1.AppError('Supplement not found', 404);
        }
        // Ensure user owns the supplement
        if (supplement.userId !== userId) {
            throw new errors_1.AppError('Unauthorized', 403);
        }
        // Check if supplement is in any cart
        const isInCart = await this.supplementRepository.isInCart(id);
        if (isInCart) {
            throw new errors_1.AppError('Cannot delete supplement that is in carts', 400);
        }
        await this.supplementRepository.delete(id);
    }
    async updateStock(id, quantity) {
        const supplement = await this.findById(id);
        if (!supplement) {
            throw new errors_1.AppError('Supplement not found', 404);
        }
        if (supplement.stock < quantity) {
            throw new errors_1.AppError('Insufficient stock', 400);
        }
        return this.supplementRepository.updateStock(id, quantity);
    }
    async search(query) {
        return this.supplementRepository.search(query);
    }
};
exports.SupplementService = SupplementService;
exports.SupplementService = SupplementService = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(supplement_repository_1.SupplementRepository)),
    __metadata("design:paramtypes", [supplement_repository_1.SupplementRepository])
], SupplementService);
//# sourceMappingURL=supplement.service.js.map