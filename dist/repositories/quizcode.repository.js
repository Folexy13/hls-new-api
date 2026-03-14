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
exports.QuizCodeRepository = void 0;
const client_1 = require("@prisma/client");
const inversify_1 = require("inversify");
let QuizCodeRepository = class QuizCodeRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    /**
     * Generate a unique quiz code
     */
    generateCode() {
        // Generate a short, readable code (8 characters)
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars like 0, O, 1, I
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }
    /**
     * Create a new quiz code with benfek data
     */
    async create(data) {
        const code = this.generateCode();
        return this.prisma.quizCode.create({
            data: {
                code,
                createdBy: data.createdBy,
                benfekName: data.benfekName,
                benfekPhone: data.benfekPhone,
                allergies: data.allergies,
                scares: data.scares,
                familyCondition: data.familyCondition,
                medications: data.medications,
                hasCurrentCondition: data.hasCurrentCondition || false,
                expiresAt: data.expiresAt,
            },
        });
    }
    /**
     * Find a quiz code by its code string
     */
    async findByCode(code) {
        return this.prisma.quizCode.findUnique({
            where: { code },
            include: {
                creator: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });
    }
    /**
     * Validate a quiz code - check if it exists, is not used, and not expired
     */
    async validateCode(code) {
        const quizCode = await this.findByCode(code);
        if (!quizCode) {
            return { valid: false, message: 'Invalid quiz code' };
        }
        if (quizCode.isUsed) {
            return { valid: false, message: 'This quiz code has already been used' };
        }
        if (quizCode.expiresAt && new Date() > quizCode.expiresAt) {
            return { valid: false, message: 'This quiz code has expired' };
        }
        return { valid: true, message: 'Quiz code is valid', quizCode };
    }
    /**
     * Mark a quiz code as used
     */
    async markAsUsed(code, userId) {
        return this.prisma.quizCode.update({
            where: { code },
            data: {
                isUsed: true,
                usedBy: userId,
                usedAt: new Date(),
            },
        });
    }
    /**
     * Get quiz codes created by a specific principal
     */
    async findByCreator(createdBy, skip, take) {
        const where = { createdBy };
        const [codes, total] = await Promise.all([
            this.prisma.quizCode.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: skip || 0,
                take: take || 50,
            }),
            this.prisma.quizCode.count({ where }),
        ]);
        return { codes, total };
    }
    /**
     * Get benfeks for a principal with optional name search
     */
    async findBenfeksByCreator(createdBy, benfekName, skip, take) {
        const where = { createdBy };
        if (benfekName) {
            where.benfekName = { contains: benfekName };
        }
        const [codes, total] = await Promise.all([
            this.prisma.quizCode.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: skip || 0,
                take: take || 50,
            }),
            this.prisma.quizCode.count({ where }),
        ]);
        return { codes, total };
    }
    /**
     * Get all quiz codes with pagination
     */
    async findAll(skip, take) {
        const [codes, total] = await Promise.all([
            this.prisma.quizCode.findMany({
                include: {
                    creator: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip: skip || 0,
                take: take || 50,
            }),
            this.prisma.quizCode.count(),
        ]);
        return { codes: codes, total };
    }
    /**
     * Delete a quiz code
     */
    async delete(id) {
        return this.prisma.quizCode.delete({
            where: { id },
        });
    }
};
exports.QuizCodeRepository = QuizCodeRepository;
exports.QuizCodeRepository = QuizCodeRepository = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], QuizCodeRepository);
//# sourceMappingURL=quizcode.repository.js.map