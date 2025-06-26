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
exports.SupplementController = void 0;
const inversify_1 = require("inversify");
const base_controller_1 = require("./base.controller");
const supplement_service_1 = require("../services/supplement.service");
const response_utility_1 = require("../utilities/response.utility");
const inversify_2 = require("inversify");
const supplement_dto_1 = require("../DTOs/supplement.dto");
const pagination_utility_1 = require("../utilities/pagination.utility");
/**
 * @swagger
 * components:
 *   securitySchemes:
 *     BearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     Supplement:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         price:
 *           type: number
 *           format: float
 *         stock:
 *           type: integer
 *         userId:
 *           type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         image:
 *           type: string
 *           nullable: true
 *       required:
 *         - id
 *         - name
 *         - description
 *         - price
 *         - stock
 *         - userId
 *         - createdAt
 *         - updatedAt
 *     CreateSupplementRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           minLength: 3
 *         description:
 *           type: string
 *           minLength: 10
 *         price:
 *           type: number
 *           format: float
 *           minimum: 0
 *           exclusiveMinimum: true
 *         stock:
 *           type: integer
 *           minimum: 0
 *         image:
 *           type: string
 *           nullable: true
 *       required:
 *         - name
 *         - description
 *         - price
 *         - stock
 *     UpdateSupplementRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           minLength: 3
 *         description:
 *           type: string
 *           minLength: 10
 *         price:
 *           type: number
 *           format: float
 *           minimum: 0
 *           exclusiveMinimum: true
 *         stock:
 *           type: integer
 *           minimum: 0
 *         image:
 *           type: string
 *           nullable: true
 *     PaginationMeta:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *         page:
 *           type: integer
 *         limit:
 *           type: integer
 *         totalPages:
 *           type: integer
 */
let SupplementController = class SupplementController extends base_controller_1.BaseController {
    constructor(container) {
        super(container);
        this.supplementService = container.get(supplement_service_1.SupplementService);
    }
    /**
     * @swagger
     * /api/v2/supplements:
     *   get:
     *     tags: [Supplements]
     *     summary: Get all supplements with pagination
     *     parameters:
     *       - in: query
     *         name: page
     *         schema:
     *           type: integer
     *           minimum: 1
     *           default: 1
     *       - in: query
     *         name: limit
     *         schema:
     *           type: integer
     *           minimum: 1
     *           maximum: 100
     *           default: 10
     *     responses:
     *       200:
     *         description: List of supplements retrieved successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 supplements:
     *                   type: array
     *                   items:
     *                     $ref: '#/components/schemas/Supplement'
     *                 meta:
     *                   $ref: '#/components/schemas/PaginationMeta'
     */
    getSupplements(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { page = 1, limit = 10 } = req.query;
                const pageNum = parseInt(page);
                const limitNum = parseInt(limit);
                const { supplements, total } = yield this.supplementService.findAll(pageNum, limitNum);
                return response_utility_1.ResponseUtil.success(res, {
                    supplements,
                    meta: pagination_utility_1.PaginationUtil.getPaginationMetadata(total, pageNum, limitNum)
                });
            }
            catch (error) {
                return response_utility_1.ResponseUtil.error(res, error);
            }
        });
    }
    /**
     * @swagger
     * /api/v2/supplements/{id}:
     *   get:
     *     tags: [Supplements]
     *     summary: Get supplement by ID
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         schema:
     *           type: integer
     *     responses:
     *       200:
     *         description: Supplement details retrieved successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 supplement:
     *                   $ref: '#/components/schemas/Supplement'
     *       404:
     *         description: Supplement not found
     */
    getSupplementById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const supplementId = parseInt(req.params.id);
                const supplement = yield this.supplementService.findById(supplementId);
                if (!supplement) {
                    return response_utility_1.ResponseUtil.error(res, 'Supplement not found', 404);
                }
                return response_utility_1.ResponseUtil.success(res, { supplement });
            }
            catch (error) {
                return response_utility_1.ResponseUtil.error(res, error);
            }
        });
    }
    /**
     * @swagger
     * /api/v2/supplements/user:
     *   get:
     *     tags: [Supplements]
     *     summary: Get supplements by authenticated user
     *     security:
     *       - BearerAuth: []
     *     responses:
     *       200:
     *         description: List of user's supplements retrieved successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 supplements:
     *                   type: array
     *                   items:
     *                     $ref: '#/components/schemas/Supplement'
     */
    getUserSupplements(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const supplements = yield this.supplementService.findByUserId(req.user.id);
                return response_utility_1.ResponseUtil.success(res, { supplements });
            }
            catch (error) {
                return response_utility_1.ResponseUtil.error(res, error);
            }
        });
    }
    /**
     * @swagger
     * /api/v2/supplements:
     *   post:
     *     tags: [Supplements]
     *     summary: Create a new supplement
     *     security:
     *       - BearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/CreateSupplementRequest'
     *     responses:
     *       201:
     *         description: Supplement created successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 supplement:
     *                   $ref: '#/components/schemas/Supplement'
     *       400:
     *         description: Invalid input data
     */
    createSupplement(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const data = supplement_dto_1.CreateSupplementSchema.parse(req.body);
                const supplement = yield this.supplementService.create(req.user.id, data);
                return response_utility_1.ResponseUtil.success(res, { supplement }, 'Supplement created successfully', 201);
            }
            catch (error) {
                return response_utility_1.ResponseUtil.error(res, error);
            }
        });
    }
    /**
     * @swagger
     * /api/v2/supplements/{id}:
     *   put:
     *     tags: [Supplements]
     *     summary: Update supplement by ID
     *     security:
     *       - BearerAuth: []
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdateSupplementRequest'
   *     responses:
   *       200:
   *         description: Supplement updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 supplement:
   *                   $ref: '#/components/schemas/Supplement'
   *       400:
   *         description: Invalid input data
   *       404:
   *         description: Supplement not found
   */
    updateSupplement(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const supplementId = parseInt(req.params.id);
                const data = supplement_dto_1.UpdateSupplementSchema.parse(req.body);
                const supplement = yield this.supplementService.update(supplementId, req.user.id, data);
                return response_utility_1.ResponseUtil.success(res, { supplement });
            }
            catch (error) {
                return response_utility_1.ResponseUtil.error(res, error);
            }
        });
    }
    /**
     * @swagger
     * /api/v2/supplements/{id}:
     *   delete:
     *     tags: [Supplements]
     *     summary: Delete supplement by ID
     *     security:
     *       - BearerAuth: []
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         schema:
     *           type: integer
     *     responses:
     *       200:
     *         description: Supplement deleted successfully
     *       404:
     *         description: Supplement not found
     */
    deleteSupplement(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const supplementId = parseInt(req.params.id);
                yield this.supplementService.delete(supplementId, req.user.id);
                return response_utility_1.ResponseUtil.success(res, null, 'Supplement deleted successfully');
            }
            catch (error) {
                return response_utility_1.ResponseUtil.error(res, error);
            }
        });
    }
    /**
     * @swagger
     * /api/v2/supplements/search:
     *   get:
     *     tags: [Supplements]
     *     summary: Search supplements
     *     parameters:
     *       - name: q
     *         in: query
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Search results retrieved successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 supplements:
     *                   type: array
     *                   items:
     *                     $ref: '#/components/schemas/Supplement'
     *       400:
     *         description: Search query is required
     */
    searchSupplements(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const query = req.query.q;
                if (!query) {
                    return response_utility_1.ResponseUtil.error(res, 'Search query is required', 400);
                }
                const supplements = yield this.supplementService.search(query);
                return response_utility_1.ResponseUtil.success(res, { supplements });
            }
            catch (error) {
                return response_utility_1.ResponseUtil.error(res, error);
            }
        });
    }
};
exports.SupplementController = SupplementController;
exports.SupplementController = SupplementController = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [inversify_2.Container])
], SupplementController);
