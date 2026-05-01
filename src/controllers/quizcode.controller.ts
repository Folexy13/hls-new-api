import { Request, RequestHandler, Response } from 'express';
import { injectable, inject } from 'inversify';
import { BaseController } from './base.controller';
import { QuizCodeRepository, CreateQuizCodeDTO } from '../repositories/quizcode.repository';
import { NotificationService } from '../services/notification.service';
import { ResponseUtil } from '../utilities/response.utility';
import { Container } from 'inversify';
import { CreateQuizCodeSchema, ValidateQuizCodeSchema, UseQuizCodeSchema, CompleteBenfekQuizSchema } from '../DTOs/quiz.dto';
import { formatHealthField } from '../utilities/health-field.utility';

@injectable()
export class QuizCodeController extends BaseController {
  constructor(
    container: Container,
    @inject(QuizCodeRepository) private quizCodeRepository: QuizCodeRepository,
    @inject(NotificationService) private notificationService: NotificationService
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
  createQuizCode: RequestHandler = async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      
      // Check if user is a principal
      if (user.role !== 'principal') {
        ResponseUtil.error(res, 'Only principals can create quiz codes', 403);
        return;
      }

      const data = CreateQuizCodeSchema.parse(req.body);
      
      const quizCode = await this.quizCodeRepository.create({
        createdBy: user.id,
        benfekName: data.benfekName,
        benfekEmail: data.benfekEmail,
        benfekPhone: data.benfekPhone,
        benfekAge: data.benfekAge,
        benfekGender: data.benfekGender,
        allergies: data.allergies,
        scares: data.scares,
        familyCondition: data.familyCondition,
        medications: data.medications,
        currentConditions: data.currentConditions,
        hasCurrentCondition: data.hasCurrentCondition ?? Boolean(data.currentConditions?.length),
      });

      await this.notificationService
        .sendBenfekCodeMessage({
          phone: data.benfekPhone,
          code: quizCode.code,
          benfekName: data.benfekName,
        })
        .catch(() => undefined);

      ResponseUtil.success(res, quizCode, 'Quiz code created successfully', 201);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        ResponseUtil.error(res, 'Validation failed', 400, error);
        return;
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
      const { code } = ValidateQuizCodeSchema.parse(req.body);
      
      const result = await this.quizCodeRepository.validateCode(code.toUpperCase());
      
      if (!result.valid) {
        ResponseUtil.error(res, result.message, 400);
        return;
      }

      // Return quiz code data (without sensitive info)
      const quizCodeData = result.quizCode ? {
        code: result.quizCode.code,
        benfekName: result.quizCode.benfekName,
        benfekEmail: (result.quizCode as any).benfekEmail,
        benfekPhone: result.quizCode.benfekPhone,
        createdBy: {
          firstName: result.quizCode.creator.firstName,
          lastName: result.quizCode.creator.lastName,
        },
      } : null;

      ResponseUtil.success(res, { valid: true, quizCode: quizCodeData }, result.message);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        ResponseUtil.error(res, 'Validation failed', 400, error);
        return;
      }
      ResponseUtil.error(res, 'Failed to validate quiz code', 500, error);
    }
  };

  /**
   * @swagger
   * /api/v2/quiz-code/verify-benfek:
   *   post:
   *     summary: Verify a benfek quiz code (Public)
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
   *         description: Benfek quiz code verified
   *       400:
   *         description: Validation error
   */
  verifyBenfekQuizCode: RequestHandler = async (req: Request, res: Response) => {
    try {
      const { code } = ValidateQuizCodeSchema.parse(req.body);
      const result = await this.quizCodeRepository.validateCode(code.toUpperCase());

      if (!result.valid || !result.quizCode) {
        ResponseUtil.error(res, result.message, 400);
        return;
      }

      const quizCode = result.quizCode;
      const data = {
        code: quizCode.code,
        benfekName: quizCode.benfekName,
        benfekEmail: (quizCode as any).benfekEmail,
        benfekPhone: quizCode.benfekPhone,
        registrationStatus: quizCode.isUsed ? 'registered' : 'not_registered',
        usedAt: quizCode.usedAt
      };

      ResponseUtil.success(res, data, 'Benfek quiz code verified');
    } catch (error: any) {
      if (error.name === 'ZodError') {
        ResponseUtil.error(res, 'Validation failed', 400, error);
        return;
      }
      ResponseUtil.error(res, 'Failed to verify benfek quiz code', 500, error);
    }
  };

  /**
   * @swagger
   * /api/v2/quiz-code/benfek-quiz:
   *   post:
   *     summary: Get quiz payload for a benfek by quiz code (Public)
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
   *         description: Quiz payload returned
   *       400:
   *         description: Validation error
   */
  getBenfekQuizByCodePublic: RequestHandler = async (req: Request, res: Response) => {
    try {
      const { code } = ValidateQuizCodeSchema.parse(req.body);
      const result = await this.quizCodeRepository.validateCode(code.toUpperCase());

      if (!result.valid || !result.quizCode) {
        ResponseUtil.error(res, result.message, 400);
        return;
      }

      const quizCode = result.quizCode;
      const payload = {
        code: quizCode.code,
        benfekName: quizCode.benfekName,
        benfekEmail: (quizCode as any).benfekEmail,
        benfekPhone: quizCode.benfekPhone,
        benfekAge: (quizCode as any).benfekAge,
        benfekGender: (quizCode as any).benfekGender,
        registrationStatus: quizCode.isUsed ? 'registered' : 'not_registered',
        quizFields: {
          basics: ['nickname', 'weight', 'height'],
          lifestyle: ['habits', 'funActivities', 'priority'],
          preferences: ['drugForm', 'budget']
        }
      };

      ResponseUtil.success(res, payload, 'Quiz payload retrieved');
    } catch (error: any) {
      if (error.name === 'ZodError') {
        ResponseUtil.error(res, 'Validation failed', 400, error);
        return;
      }
      ResponseUtil.error(res, 'Failed to retrieve quiz payload', 500, error);
    }
  };

  /**
   * @swagger
   * /api/v2/quiz-code/complete:
   *   post:
   *     summary: Complete benfek quiz and register
   *     tags: [QuizCode]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - code
   *               - basics
   *               - lifestyle
   *               - preferences
   *             properties:
   *               code:
   *                 type: string
   *               basics:
   *                 type: object
   *                 required: [weight, height]
   *                 properties:
   *                   nickname:
   *                     type: string
   *                   weight:
   *                     type: string
   *                   height:
   *                     type: string
   *               lifestyle:
   *                 type: object
   *                 required: [habits, funActivities, priority]
   *                 properties:
   *                   habits:
   *                     type: string
   *                   funActivities:
   *                     type: string
   *                   priority:
   *                     type: string
   *               preferences:
   *                 type: object
   *                 required: [drugForm, budget]
   *                 properties:
   *                   drugForm:
   *                     type: string
   *                   budget:
   *                     type: number
   *     responses:
   *       200:
   *         description: Quiz completed successfully
   *       400:
   *         description: Validation error
   */
  completeBenfekQuiz: RequestHandler = async (req: Request, res: Response) => {
    try {
      const data = CompleteBenfekQuizSchema.parse(req.body);
      const validation = await this.quizCodeRepository.validateCode(data.code.toUpperCase());
      if (!validation.valid || !validation.quizCode) {
        ResponseUtil.error(res, validation.message, 400);
        return;
      }

      const updated = await this.quizCodeRepository.completeBenfekQuiz(data.code.toUpperCase(), {
        basicNickname: data.basics.nickname,
        basicWeight: data.basics.weight,
        basicHeight: data.basics.height,
        lifestyleHabits: data.lifestyle.habits,
        lifestyleFun: data.lifestyle.funActivities,
        lifestylePriority: data.lifestyle.priority,
        preferenceDrugForm: data.preferences.drugForm,
        preferenceBudget: data.preferences.budget,
      });

      ResponseUtil.success(res, { quizCode: updated }, 'Quiz completed successfully');
    } catch (error: any) {
      if (error.name === 'ZodError') {
        ResponseUtil.error(res, 'Validation failed', 400, error);
        return;
      }
      ResponseUtil.error(res, 'Failed to complete quiz', 500, error);
    }
  };

  /**
   * @swagger
   * /api/v2/quiz-code/use:
   *   post:
   *     summary: Use a quiz code (Benfek only)
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
   *               - code
   *             properties:
   *               code:
   *                 type: string
   *     responses:
   *       200:
   *         description: Quiz code used successfully
   *       400:
   *         description: Validation error
   *       403:
   *         description: Forbidden - Only benfeks can use quiz codes
   */
  useQuizCode: RequestHandler = async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (user.role !== 'benfek') {
        ResponseUtil.error(res, 'Only benfeks can use quiz codes', 403);
        return;
      }

      const { code } = UseQuizCodeSchema.parse(req.body);
      const validation = await this.quizCodeRepository.validateCode(code.toUpperCase());

      if (!validation.valid) {
        ResponseUtil.error(res, validation.message, 400);
        return;
      }

      const updated = await this.quizCodeRepository.markAsUsed(code.toUpperCase(), user.id);
      ResponseUtil.success(res, updated, 'Quiz code used successfully');
    } catch (error: any) {
      if (error.name === 'ZodError') {
        ResponseUtil.error(res, 'Validation failed', 400, error);
        return;
      }
      ResponseUtil.error(res, 'Failed to use quiz code', 500, error);
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
  getMyQuizCodes: RequestHandler = async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      
      if (user.role !== 'principal') {
        ResponseUtil.error(res, 'Only principals can view quiz codes', 403);
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const result = await this.quizCodeRepository.findByCreator(user.id, skip, limit);

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
   * /api/v2/quiz-code/benfeks:
   *   get:
   *     summary: Get benfeks created by the current principal (with optional name search)
   *     tags: [QuizCode]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: name
   *         schema:
   *           type: string
   *         description: Benfek name search (partial match)
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
   *         description: List of benfeks
   *       403:
   *         description: Forbidden - Only principals can view benfeks
   */
  getMyBenfeks: RequestHandler = async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (user.role !== 'principal') {
        ResponseUtil.error(res, 'Only principals can view benfeks', 403);
        return;
      }

      const name = (req.query.name as string) || (req.query.benfekName as string) || undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const result = await this.quizCodeRepository.findBenfeksByCreator(user.id, name, skip, limit);

      const benfeks = result.codes.map(code => ({
        id: code.id,
        code: code.code,
        benfekName: code.benfekName,
        benfekPhone: code.benfekPhone,
        registrationStatus: code.isUsed ? 'registered' : 'not_registered',
        usedAt: code.usedAt,
        createdAt: code.createdAt,
        allergies: formatHealthField(code.allergies),
        scares: formatHealthField(code.scares),
        familyCondition: formatHealthField(code.familyCondition),
        medications: formatHealthField(code.medications),
        hasCurrentCondition: code.hasCurrentCondition,
        currentConditions: (code as any).currentConditions ?? undefined,
      }));

      ResponseUtil.success(res, {
        benfeks,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
      }, 'Benfeks retrieved successfully');
    } catch (error: any) {
      ResponseUtil.error(res, 'Failed to retrieve benfeks', 500, error);
    }
  };

  /**
   * @swagger
   * /api/v2/quiz-code/benfeks/{code}:
   *   get:
   *     summary: Get quiz data for a benfek by code
   *     tags: [QuizCode]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: code
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Quiz data retrieved
   *       403:
   *         description: Forbidden - Only principals can view benfek quiz data
   *       404:
   *         description: Quiz code not found
   */
  getBenfekQuizByCode: RequestHandler = async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (user.role !== 'principal') {
        ResponseUtil.error(res, 'Only principals can view benfek quiz data', 403);
        return;
      }

      const code = ((req.params.code as string) || '').toUpperCase();
      const quizCode = await this.quizCodeRepository.findByCode(code);
      if (!quizCode || quizCode.createdBy !== user.id) {
        ResponseUtil.error(res, 'Quiz code not found', 404);
        return;
      }

      ResponseUtil.success(res, quizCode, 'Quiz data retrieved successfully');
    } catch (error: any) {
      ResponseUtil.error(res, 'Failed to retrieve quiz data', 500, error);
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
  deleteQuizCode: RequestHandler = async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      
      if (user.role !== 'principal') {
        ResponseUtil.error(res, 'Only principals can delete quiz codes', 403);
        return;
      }

      const id = parseInt(req.params.id as any);
      
      await this.quizCodeRepository.delete(id);

      ResponseUtil.success(res, null, 'Quiz code deleted successfully');
    } catch (error: any) {
      ResponseUtil.error(res, 'Failed to delete quiz code', 500, error);
    }
  };
}
