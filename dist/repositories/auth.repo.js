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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const inversify_1 = require("inversify");
let AuthRepositoryImpl = class AuthRepositoryImpl {
    constructor(prisma) {
        this.prisma = prisma;
    }
    createUser(data) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.prisma.user.create({
                data: {
                    email: data.email,
                    password: data.password, // Note: Password should be hashed before storage
                    firstName: data.firstName,
                    lastName: data.lastName
                }
            });
        });
    }
    findUserByEmail(email) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.prisma.user.findUnique({
                where: { email }
            });
        });
    }
    saveRefreshToken(userId, refreshToken) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.prisma.refreshToken.create({
                data: {
                    token: refreshToken,
                    userId
                }
            });
        });
    }
    findUserByRefreshToken(refreshToken) {
        return __awaiter(this, void 0, void 0, function* () {
            const tokenRecord = yield this.prisma.refreshToken.findUnique({
                where: { token: refreshToken },
                include: { user: true }
            });
            return (tokenRecord === null || tokenRecord === void 0 ? void 0 : tokenRecord.user) || null;
        });
    }
    invalidateRefreshToken(refreshToken) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.prisma.refreshToken.delete({
                where: { token: refreshToken }
            });
        });
    }
};
AuthRepositoryImpl = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], AuthRepositoryImpl);
exports.default = AuthRepositoryImpl;
