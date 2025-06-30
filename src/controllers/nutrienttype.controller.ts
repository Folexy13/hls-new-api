import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { BaseController } from './base.controller';
import { Container } from 'inversify';
import { NutrientTypeService } from '../services/nutrienttype.service';
import { CreateNutrientTypeSchema, UpdateNutrientTypeSchema, GetNutrientTypeByCodeSchema } from '../DTOs/nutrienttype.dto';
import { ResponseUtil } from '../utilities/response.utility';

@injectable()
export class NutrientTypeController extends BaseController {
  constructor(
    container: Container,
    @inject(NutrientTypeService) private nutrientTypeService: NutrientTypeService
  ) {
    super(container);
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
  async getNutrientTypes(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const result = await this.nutrientTypeService.findAll(page, limit);
    return ResponseUtil.success(res, result.nutrientTypes, 'Nutrient types retrieved', 200, { pagination: { total: result.total, page, limit, totalPages: Math.ceil(result.total / limit), hasNextPage: page * limit < result.total, hasPrevPage: page > 1 } });
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
  async getNutrientTypeById(req: Request, res: Response) {
    const id = parseInt(req.params.id);
    const nutrientType = await this.nutrientTypeService.findById(id);
    if (!nutrientType) return ResponseUtil.error(res, 'Nutrient type not found', 404);
    return ResponseUtil.success(res, nutrientType, 'Nutrient type retrieved');
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
  async getNutrientTypeByCode(req: Request, res: Response) {
    const parse = GetNutrientTypeByCodeSchema.safeParse({ code: req.params.code });
    if (!parse.success) return ResponseUtil.error(res, 'Invalid code', 400, parse.error);
    const nutrientType = await this.nutrientTypeService.findByCode(parse.data.code);
    if (!nutrientType) return ResponseUtil.error(res, 'Nutrient type not found', 404);
    return ResponseUtil.success(res, nutrientType, 'Nutrient type retrieved');
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
  async createNutrientType(req: Request, res: Response) {
    // Remove userId from body, inject from auth
    const parse = CreateNutrientTypeSchema.omit({ userId: true }).safeParse(req.body);
    if (!parse.success) return ResponseUtil.error(res, 'Validation error', 400, parse.error);
    const userId = (req as any).user.id;
    // Accept nested basic, lifestyle, preference
    const nutrientType = await this.nutrientTypeService.create(userId, { ...parse.data, userId });
    return ResponseUtil.success(res, nutrientType, 'Nutrient type created', 201);
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
  async updateNutrientType(req: Request, res: Response) {
    const id = parseInt(req.params.id);
    const parse = UpdateNutrientTypeSchema.safeParse(req.body);
    if (!parse.success) return ResponseUtil.error(res, 'Validation error', 400, parse.error);
    const userId = (req as any).user.id;
    const nutrientType = await this.nutrientTypeService.update(id, userId, parse.data);
    return ResponseUtil.success(res, nutrientType, 'Nutrient type updated');
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
  async deleteNutrientType(req: Request, res: Response) {
    const id = parseInt(req.params.id);
    const userId = (req as any).user.id;
    await this.nutrientTypeService.delete(id, userId);
    return ResponseUtil.success(res, null, 'Nutrient type deleted');
  }
}

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
