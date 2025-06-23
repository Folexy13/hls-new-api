import { injectable } from 'inversify';
import { Response } from 'express';
import { BaseController } from './base.controller';
import { SupplementService } from '../services/supplement.service';
import { ResponseUtil } from '../utilities/response.utility';
import { Container } from 'inversify';
import { AuthenticatedRequest } from '../types/auth.types';
import { CreateSupplementSchema, UpdateSupplementSchema } from '../DTOs/supplement.dto';
import { PaginationUtil } from '../utilities/pagination.utility';

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

@injectable()
export class SupplementController extends BaseController {
  private supplementService: SupplementService;

  constructor(container: Container) {
    super(container);
    this.supplementService = container.get(SupplementService);
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
  async getSupplements(req: AuthenticatedRequest, res: Response) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const { supplements, total } = await this.supplementService.findAll(pageNum, limitNum);
      
      return ResponseUtil.success(res, { 
        supplements,
        meta: PaginationUtil.getPaginationMetadata(total, pageNum, limitNum)
      });
    } catch (error) {
      return ResponseUtil.error(res, error as string);
    }
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
  async getSupplementById(req: AuthenticatedRequest, res: Response) {
    try {
      const supplementId = parseInt(req.params.id);
      const supplement = await this.supplementService.findById(supplementId);
      
      if (!supplement) {
        return ResponseUtil.error(res, 'Supplement not found', 404);
      }

      return ResponseUtil.success(res, { supplement });
    } catch (error) {
      return ResponseUtil.error(res, error as string);
    }
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
  async getUserSupplements(req: AuthenticatedRequest, res: Response) {
    try {
      const supplements = await this.supplementService.findByUserId(req.user.id);
      return ResponseUtil.success(res, { supplements });
    } catch (error) {
      return ResponseUtil.error(res, error as string);
    }
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
  async createSupplement(req: AuthenticatedRequest, res: Response) {
    try {
      const data = CreateSupplementSchema.parse(req.body);
      const supplement = await this.supplementService.create(req.user.id, data);
      return ResponseUtil.success(res, { supplement }, 'Supplement created successfully', 201);
    } catch (error) {
      return ResponseUtil.error(res, error as string);
    }
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
  async updateSupplement(req: AuthenticatedRequest, res: Response) {
    try {
      const supplementId = parseInt(req.params.id);
      const data = UpdateSupplementSchema.parse(req.body);
      const supplement = await this.supplementService.update(supplementId, req.user.id, data);
      return ResponseUtil.success(res, { supplement });
    } catch (error) {
      return ResponseUtil.error(res, error as string);
    }
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
  async deleteSupplement(req: AuthenticatedRequest, res: Response) {
    try {
      const supplementId = parseInt(req.params.id);
      await this.supplementService.delete(supplementId, req.user.id);
      return ResponseUtil.success(res, null, 'Supplement deleted successfully');
    } catch (error) {
      return ResponseUtil.error(res, error as string);
    }
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
  async searchSupplements(req: AuthenticatedRequest, res: Response) {
    try {
      const query = req.query.q as string;
      if (!query) {
        return ResponseUtil.error(res, 'Search query is required', 400);
      }

      const supplements = await this.supplementService.search(query);
      return ResponseUtil.success(res, { supplements });
    } catch (error) {
      return ResponseUtil.error(res, error as string);
    }
  }
}