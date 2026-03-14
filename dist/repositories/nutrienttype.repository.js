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
exports.NutrientTypeRepository = void 0;
const client_1 = require("@prisma/client");
const inversify_1 = require("inversify");
let NutrientTypeRepository = class NutrientTypeRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(skip = 0, take = 10) {
        const [items, total] = await Promise.all([
            this.prisma.nutrientType.findMany({
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                include: {
                    basic: true,
                    lifestyle: true,
                    preference: true,
                    user: { select: { id: true, email: true } },
                },
            }),
            this.prisma.nutrientType.count(),
        ]);
        return { items, total };
    }
    async findById(id) {
        return this.prisma.nutrientType.findUnique({
            where: { id },
            include: {
                basic: true,
                lifestyle: true,
                preference: true,
                user: { select: { id: true, email: true } },
            },
        });
    }
    async findByUserId(userId) {
        return this.prisma.nutrientType.findUnique({
            where: { userId },
            include: {
                basic: true,
                lifestyle: true,
                preference: true,
                user: { select: { id: true, email: true } },
            },
        });
    }
    async findByCode(code) {
        return this.prisma.nutrientType.findFirst({
            where: { code },
            include: {
                basic: true,
                lifestyle: true,
                preference: true,
                user: { select: { id: true, email: true } },
            },
        });
    }
    async createWithNested(data) {
        // Accepts: { code, userId, basic, lifestyle, preference }
        return this.prisma.nutrientType.create({
            data: {
                code: data.code,
                userId: data.userId,
                basic: data.basic ? { create: data.basic } : undefined,
                lifestyle: data.lifestyle ? { create: data.lifestyle } : undefined,
                preference: data.preference ? { create: data.preference } : undefined,
            },
            include: {
                basic: true,
                lifestyle: true,
                preference: true,
                user: { select: { id: true, email: true } },
            },
        });
    }
    async update(id, data) {
        return this.prisma.nutrientType.update({ where: { id }, data });
    }
    async delete(id) {
        await this.prisma.nutrientType.delete({ where: { id } });
    }
};
exports.NutrientTypeRepository = NutrientTypeRepository;
exports.NutrientTypeRepository = NutrientTypeRepository = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], NutrientTypeRepository);
//# sourceMappingURL=nutrienttype.repository.js.map