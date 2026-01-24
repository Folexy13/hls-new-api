import { Request, RequestHandler, Response } from 'express';
import { injectable, inject } from 'inversify';
import { BaseController } from './base.controller';
import { QuizCodeRepository, CreateQuizCodeDTO } from '../repositories/quizcode.repository';
import { ResponseUtil } from '../utilities/response.utility';
import { Container } from 'inversify';
import { AuthenticatedRequest } from '../types/auth.types';
import { z } from 'zod';

// Validation schemas
const CreateQuizCodeSchema = z.object({
  benfekName: z.string().min(1, 'Benfek name is required'),
  benfekPhone: z.string().min(1, 'Benfek phone is required'),
  allergies: z.string().optional(),
  scares: z.string().optional(),
  familyCondition: z.string().optional(),
  medications: z.string().optional(),
  hasCurrentCondition: z.boolean().optional(),
});

const ValidateCodeSchema = z.object({
  code: z.string().min(1, 'Quiz code is required'),
});

@injectable()
export class QuizCodeController extends BaseController {
  constructor(
    container: Container,
    @inject(QuizCodeRepository) private quizCodeRepository: QuizCodeRepository
  ) {
    super(container);
  }

  /**
   * @swagger
   * /api/v2/quiz-code/create:
   *   post:
   *     summary: Create a new quiz code (Principal only)
   *     tags: [QuizCode]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - benfekName
   *               - benfekPhone
   *             properties:
   *               benfekName:
   *                 type: string
   *               benfekPhone:
   *                 type: string
   *               allergies:
   *                 type: string
   *               scares:
   *                 type: string
   *               familyCondition:
   *                 type: string
   *               medications:
   *                 type: string
   *               hasCurrentCondition:
   *                 type: boolean
   *     responses:
   *       201:
   *         description: Quiz code created successfully
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - Only principals can create quiz codes
   */
  createQuizCode: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Check if user is a principal
      if (req.user.role !== 'principal') {
        return ResponseUtil.error(res, 'Only principals can create quiz codes', 403);
      }

      const data = CreateQuizCodeSchema.parse(req.body);
      
      const quizCode = await this.quizCodeRepository.create({
        createdBy: req.user.id,
        benfekName: data.benfekName,
        benfekPhone: data.benfekPhone,
        allergies: data.allergies,
        scares: data.scares,
        familyCondition: data.familyCondition,
        medications: data.medications,
        hasCurrentCondition: data.hasCurrentCondition,
      });

      ResponseUtil.success(res, quizCode, 'Quiz code created successfully', 201);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return ResponseUtil.error(res, 'Validation failed', 400, error);
      }
      ResponseUtil.error(res, 'Failed to create quiz code', 500, error);
    }
  };

  /**
   * @swagger
   * /api/v2/quiz-code/validate:
   *   post:
   *     summary: Validate a quiz code (Public)
   *     tags: [QuizCode]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - code
   *             properties:
   *               code:
   *                 type: string
   *     responses:
   *       200:
   *         description: Quiz code validation result
   *       400:
   *         description: Validation error
   */
  validateQuizCode: RequestHandler = async (req: Request, res: Response) => {
    try {
      const { code } = ValidateCodeSchema.parse(req.body);
      
      const result = await this.quizCodeRepository.validateCode(code.toUpperCase());
      
      if (!result.valid) {
        return ResponseUtil.error(res, result.message, 400);
      }

      // Return quiz code data (without sensitive info)
      const quizCodeData = result.quizCode ? {
        code: result.quizCode.code,
        benfekName: result.quizCode.benfekName,
        benfekPhone: result.quizCode.benfekPhone,
        createdBy: {
          firstName: result.quizCode.creator.firstName,
          lastName: result.quizCode.creator.lastName,
        },
      } : null;

      ResponseUtil.success(res, { valid: true, quizCode: quizCodeData }, result.message);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return ResponseUtil.error(res, 'Validation failed', 400, error);
      }
      ResponseUtil.error(res, 'Failed to validate quiz code', 500, error);
    }
  };

  /**
   * @swagger
   * /api/v2/quiz-code/my-codes:
   *   get:
   *     summary: Get quiz codes created by the current principal
   *     tags: [QuizCode]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *         description: Page number
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *         description: Items per page
   *     responses:
   *       200:
   *         description: List of quiz codes
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - Only principals can view their codes
   */
  getMyQuizCodes: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user.role !== 'principal') {
        return ResponseUtil.error(res, 'Only principals can view quiz codes', 403);
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const result = await this.quizCodeRepository.findByCreator(req.user.id, skip, limit);

      ResponseUtil.success(res, {
        codes: result.codes,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
      }, 'Quiz codes retrieved successfully');
    } catch (error: any) {
      ResponseUtil.error(res, 'Failed to retrieve quiz codes', 500, error);
    }
  };

  /**
   * @swagger
   * /api/v2/quiz-code/{id}:
   *   delete:
   *     summary: Delete a quiz code (Principal only)
   *     tags: [QuizCode]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Quiz code deleted successfully
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   *       404:
   *         description: Quiz code not found
   */
  deleteQuizCode: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user.role !== 'principal') {
        return ResponseUtil.error(res, 'Only principals can delete quiz codes', 403);
      }

      const id = parseInt(req.params.id);
      
      await this.quizCodeRepository.delete(id);

      ResponseUtil.success(res, null, 'Quiz code deleted successfully');
    } catch (error: any) {
      ResponseUtil.error(res, 'Failed to delete quiz code', 500, error);
    }
  };
}
