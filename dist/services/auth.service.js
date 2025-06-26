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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const inversify_1 = require("inversify");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth_repo_1 = __importDefault(require("../repositories/auth.repo"));
const errors_1 = require("../utilities/errors");
let AuthService = class AuthService {
    constructor(authRepository) {
        this.authRepository = authRepository;
    }
    register(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const existingUser = yield this.authRepository.findUserByEmail(data.email);
            if (existingUser) {
                throw new Error('User already exists');
            }
            const hashedPassword = yield bcrypt_1.default.hash(data.password, 10);
            const user = yield this.authRepository.createUser(Object.assign(Object.assign({}, data), { password: hashedPassword }));
            const { password } = user, userWithoutPassword = __rest(user, ["password"]);
            return userWithoutPassword;
        });
    }
    login(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this.authRepository.findUserByEmail(data.email);
            if (!user) {
                throw new errors_1.UnauthorizedError('Invalid credentials');
            }
            const isPasswordValid = yield bcrypt_1.default.compare(data.password, user.password);
            if (!isPasswordValid) {
                throw new errors_1.UnauthorizedError('Invalid credentials');
            }
            const accessToken = this.generateAccessToken(user);
            const refreshToken = this.generateRefreshToken(user);
            yield this.authRepository.saveRefreshToken(user.id, refreshToken);
            const { password } = user, userWithoutPassword = __rest(user, ["password"]);
            return {
                user: userWithoutPassword,
                tokens: {
                    accessToken,
                    refreshToken
                }
            };
        });
    }
    refreshToken(refreshToken) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this.authRepository.findUserByRefreshToken(refreshToken);
            if (!user) {
                throw new errors_1.UnauthorizedError('Invalid refresh token');
            }
            const newAccessToken = this.generateAccessToken(user);
            const newRefreshToken = this.generateRefreshToken(user);
            yield this.authRepository.invalidateRefreshToken(refreshToken);
            yield this.authRepository.saveRefreshToken(user.id, newRefreshToken);
            return {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken
            };
        });
    }
    logout(refreshToken) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.authRepository.invalidateRefreshToken(refreshToken);
        });
    }
    generateAccessToken(user) {
        return jsonwebtoken_1.default.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '15m' });
    }
    generateRefreshToken(user) {
        return jsonwebtoken_1.default.sign({ userId: user.id }, process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key', { expiresIn: '7d' });
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(auth_repo_1.default)),
    __metadata("design:paramtypes", [auth_repo_1.default])
], AuthService);
