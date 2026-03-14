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
exports.NutrientTypeController = void 0;
const inversify_1 = require("inversify");
const base_controller_1 = require("./base.controller");
const inversify_2 = require("inversify");
const nutrienttype_service_1 = require("../services/nutrienttype.service");
const nutrienttype_dto_1 = require("../DTOs/nutrienttype.dto");
const response_utility_1 = require("../utilities/response.utility");
let NutrientTypeController = class NutrientTypeController extends base_controller_1.BaseController {
    constructor(container, nutrientTypeService) {
        super(container);
        this.nutrientTypeService = nutrientTypeService;
    }
    /**
     * @swagger
     * /api/v2/nutrient-types:
     *   get:
     *     tags: [NutrientTypes]
     *     summary: Get all nutrient types with pagination
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
     *         description: List of nutrient types retrieved successfully
     */
    async getNutrientTypes(req, res) {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const result = await this.nutrientTypeService.findAll(page, limit);
        return response_utility_1.ResponseUtil.success(res, result.nutrientTypes, 'Nutrient types retrieved', 200, { pagination: { total: result.total, page, limit, totalPages: Math.ceil(result.total / limit), hasNextPage: page * limit < result.total, hasPrevPage: page > 1 } });
    }
    /**
     * @swagger
     * /api/v2/nutrient-types/{id}:
     *   get:
     *     tags: [NutrientTypes]
     *     summary: Get a nutrient type by ID
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *     responses:
     *       200:
     *         description: Nutrient type retrieved successfully
     *       404:
     *         description: Nutrient type not found
     */
    async getNutrientTypeById(req, res) {
        const id = parseInt(req.params.id);
        const nutrientType = await this.nutrientTypeService.findById(id);
        if (!nutrientType)
            return response_utility_1.ResponseUtil.error(res, 'Nutrient type not found', 404);
        return response_utility_1.ResponseUtil.success(res, nutrientType, 'Nutrient type retrieved');
    }
    /**
     * @swagger
     * /api/v2/nutrient-types/code/{code}:
     *   get:
     *     tags: [NutrientTypes]
     *     summary: Get a nutrient type by code
     *     parameters:
     *       - in: path
     *         name: code
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Nutrient type retrieved successfully
     *       404:
     *         description: Nutrient type not found
     */
    async getNutrientTypeByCode(req, res) {
        const parse = nutrienttype_dto_1.GetNutrientTypeByCodeSchema.safeParse({ code: req.params.code });
        if (!parse.success)
            return response_utility_1.ResponseUtil.error(res, 'Invalid code', 400, parse.error);
        const nutrientType = await this.nutrientTypeService.findByCode(parse.data.code);
        if (!nutrientType)
            return response_utility_1.ResponseUtil.error(res, 'Nutrient type not found', 404);
        return response_utility_1.ResponseUtil.success(res, nutrientType, 'Nutrient type retrieved');
    }
    /**
     * @swagger
     * /api/v2/nutrient-types:
     *   post:
     *     tags: [NutrientTypes]
     *     summary: Create a new nutrient type
     *     security:
     *       - BearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/CreateNutrientTypeDTO'
     *     responses:
     *       201:
     *         description: Nutrient type created successfully
     *       400:
     *         description: Validation error
     */
    async createNutrientType(req, res) {
        // Remove userId from body, inject from auth
        const parse = nutrienttype_dto_1.CreateNutrientTypeSchema.omit({ userId: true }).safeParse(req.body);
        if (!parse.success)
            return response_utility_1.ResponseUtil.error(res, 'Validation error', 400, parse.error);
        const userId = req.user.id;
        // Accept nested basic, lifestyle, preference
        const nutrientType = await this.nutrientTypeService.create(userId, { ...parse.data, userId });
        return response_utility_1.ResponseUtil.success(res, nutrientType, 'Nutrient type created', 201);
    }
    /**
     * @swagger
     * /api/v2/nutrient-types/{id}:
     *   put:
     *     tags: [NutrientTypes]
     *     summary: Update a nutrient type
     *     security:
     *       - BearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/UpdateNutrientTypeDTO'
     *     responses:
     *       200:
     *         description: Nutrient type updated successfully
     *       400:
     *         description: Validation error
     *       404:
     *         description: Nutrient type not found
     */
    async updateNutrientType(req, res) {
        const id = parseInt(req.params.id);
        const parse = nutrienttype_dto_1.UpdateNutrientTypeSchema.safeParse(req.body);
        if (!parse.success)
            return response_utility_1.ResponseUtil.error(res, 'Validation error', 400, parse.error);
        const userId = req.user.id;
        const nutrientType = await this.nutrientTypeService.update(id, userId, parse.data);
        return response_utility_1.ResponseUtil.success(res, nutrientType, 'Nutrient type updated');
    }
    /**
     * @swagger
     * /api/v2/nutrient-types/{id}:
     *   delete:
     *     tags: [NutrientTypes]
     *     summary: Delete a nutrient type
     *     security:
     *       - BearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *     responses:
     *       200:
     *         description: Nutrient type deleted successfully
     *       404:
     *         description: Nutrient type not found
     */
    async deleteNutrientType(req, res) {
        const id = parseInt(req.params.id);
        const userId = req.user.id;
        await this.nutrientTypeService.delete(id, userId);
        return response_utility_1.ResponseUtil.success(res, null, 'Nutrient type deleted');
    }
};
exports.NutrientTypeController = NutrientTypeController;
exports.NutrientTypeController = NutrientTypeController = __decorate([
    (0, inversify_1.injectable)(),
    __param(1, (0, inversify_1.inject)(nutrienttype_service_1.NutrientTypeService)),
    __metadata("design:paramtypes", [inversify_2.Container,
        nutrienttype_service_1.NutrientTypeService])
], NutrientTypeController);
/**
 * @swagger
 * components:
 *   schemas:
 *     BasicInput:
 *       type: object
 *       required:
 *         - gender
 *         - age
 *         - weight
 *         - height
 *       properties:
 *         gender:
 *           type: string
 *         nickname:
 *           type: string
 *         age:
 *           type: string
 *         weight:
 *           type: string
 *         height:
 *           type: string
 *     LifestyleInput:
 *       type: object
 *       required:
 *         - habit
 *         - fun
 *         - routine
 *         - career
 *       properties:
 *         habit:
 *           type: string
 *         fun:
 *           type: string
 *         routine:
 *           type: string
 *         career:
 *           type: string
 *     PreferenceInput:
 *       type: object
 *       required:
 *         - drugForm
 *         - minBudget
 *         - maxBudget
 *       properties:
 *         drugForm:
 *           type: string
 *         minBudget:
 *           type: number
 *         maxBudget:
 *           type: number
 *     CreateNutrientTypeDTO:
 *       type: object
 *       required:
 *         - code
 *       properties:
 *         code:
 *           type: string
 *           description: Unique code for the nutrient type
 *         basic:
 *           $ref: '#/components/schemas/BasicInput'
 *         lifestyle:
 *           $ref: '#/components/schemas/LifestyleInput'
 *         preference:
 *           $ref: '#/components/schemas/PreferenceInput'
 *     UpdateNutrientTypeDTO:
 *       type: object
 *       properties:
 *         code:
 *           type: string
 *           description: Unique code for the nutrient type
 *         basic:
 *           $ref: '#/components/schemas/BasicInput'
 *         lifestyle:
 *           $ref: '#/components/schemas/LifestyleInput'
 *         preference:
 *           $ref: '#/components/schemas/PreferenceInput'
 *     GetNutrientTypeByCodeDTO:
 *       type: object
 *       required:
 *         - code
 *       properties:
 *         code:
 *           type: string
 *           description: Unique code for the nutrient type
 */
//# sourceMappingURL=nutrienttype.controller.js.map