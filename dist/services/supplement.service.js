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
exports.SupplementService = void 0;
const inversify_1 = require("inversify");
const errors_1 = require("../utilities/errors");
const supplement_repository_1 = require("../repositories/supplement.repository");
let SupplementService = class SupplementService {
    constructor(supplementRepository) {
        this.supplementRepository = supplementRepository;
    }
    findAll() {
        return __awaiter(this, arguments, void 0, function* (page = 1, limit = 10) {
            const skip = (page - 1) * limit;
            const result = yield this.supplementRepository.findAll(skip, limit);
            return { supplements: result.items, total: result.total };
        });
    }
    findById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.supplementRepository.findById(id);
        });
    }
    findByUserId(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.supplementRepository.findByUserId(userId);
        });
    }
    create(userId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.supplementRepository.create(Object.assign(Object.assign({}, data), { userId }));
        });
    }
    update(id, userId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const supplement = yield this.findById(id);
            if (!supplement) {
                throw new errors_1.AppError('Supplement not found', 404);
            }
            // Ensure user owns the supplement
            if (supplement.userId !== userId) {
                throw new errors_1.AppError('Unauthorized', 403);
            }
            return this.supplementRepository.update(id, data);
        });
    }
    delete(id, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const supplement = yield this.findById(id);
            if (!supplement) {
                throw new errors_1.AppError('Supplement not found', 404);
            }
            // Ensure user owns the supplement
            if (supplement.userId !== userId) {
                throw new errors_1.AppError('Unauthorized', 403);
            }
            // Check if supplement is in any cart
            const isInCart = yield this.supplementRepository.isInCart(id);
            if (isInCart) {
                throw new errors_1.AppError('Cannot delete supplement that is in carts', 400);
            }
            yield this.supplementRepository.delete(id);
        });
    }
    updateStock(id, quantity) {
        return __awaiter(this, void 0, void 0, function* () {
            const supplement = yield this.findById(id);
            if (!supplement) {
                throw new errors_1.AppError('Supplement not found', 404);
            }
            if (supplement.stock < quantity) {
                throw new errors_1.AppError('Insufficient stock', 400);
            }
            return this.supplementRepository.updateStock(id, quantity);
        });
    }
    search(query) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.supplementRepository.search(query);
        });
    }
};
exports.SupplementService = SupplementService;
exports.SupplementService = SupplementService = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(supplement_repository_1.SupplementRepository)),
    __metadata("design:paramtypes", [supplement_repository_1.SupplementRepository])
], SupplementService);
