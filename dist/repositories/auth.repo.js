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
const client_1 = require("@prisma/client");
const inversify_1 = require("inversify");
let AuthRepositoryImpl = class AuthRepositoryImpl {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createUser(data) {
        return this.prisma.user.create({
            data: {
                email: data.email,
                password: data.password, // Note: Password should be hashed before storage
                firstName: data.firstName,
                lastName: data.lastName
            }
        });
    }
    async findUserByEmail(email) {
        return this.prisma.user.findUnique({
            where: { email }
        });
    }
    async saveRefreshToken(userId, refreshToken) {
        await this.prisma.refreshToken.create({
            data: {
                token: refreshToken,
                userId
            }
        });
    }
    async findUserByRefreshToken(refreshToken) {
        const tokenRecord = await this.prisma.refreshToken.findUnique({
            where: { token: refreshToken },
            include: { user: true }
        });
        return tokenRecord?.user || null;
    }
    async invalidateRefreshToken(refreshToken) {
        await this.prisma.refreshToken.delete({
            where: { token: refreshToken }
        });
    }
};
AuthRepositoryImpl = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], AuthRepositoryImpl);
exports.default = AuthRepositoryImpl;
//# sourceMappingURL=auth.repo.js.map