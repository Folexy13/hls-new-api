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
exports.QuizCodeController = void 0;
const inversify_1 = require("inversify");
const base_controller_1 = require("./base.controller");
const quizcode_repository_1 = require("../repositories/quizcode.repository");
const response_utility_1 = require("../utilities/response.utility");
const inversify_2 = require("inversify");
const quiz_dto_1 = require("../DTOs/quiz.dto");
let QuizCodeController = class QuizCodeController extends base_controller_1.BaseController {
    constructor(container, quizCodeRepository) {
        super(container);
        this.quizCodeRepository = quizCodeRepository;
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
        this.createQuizCode = async (req, res) => {
            try {
                const user = req.user;
                // Check if user is a principal
                if (user.role !== 'principal') {
                    response_utility_1.ResponseUtil.error(res, 'Only principals can create quiz codes', 403);
                    return;
                }
                const data = quiz_dto_1.CreateQuizCodeSchema.parse(req.body);
                const quizCode = await this.quizCodeRepository.create({
                    createdBy: user.id,
                    benfekName: data.benfekName,
                    benfekPhone: data.benfekPhone,
                    allergies: data.allergies,
                    scares: data.scares,
                    familyCondition: data.familyCondition,
                    medications: data.medications,
                    hasCurrentCondition: data.hasCurrentCondition,
                });
                response_utility_1.ResponseUtil.success(res, quizCode, 'Quiz code created successfully', 201);
            }
            catch (error) {
                if (error.name === 'ZodError') {
                    response_utility_1.ResponseUtil.error(res, 'Validation failed', 400, error);
                    return;
                }
                response_utility_1.ResponseUtil.error(res, 'Failed to create quiz code', 500, error);
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
        this.validateQuizCode = async (req, res) => {
            try {
                const { code } = quiz_dto_1.ValidateQuizCodeSchema.parse(req.body);
                const result = await this.quizCodeRepository.validateCode(code.toUpperCase());
                if (!result.valid) {
                    response_utility_1.ResponseUtil.error(res, result.message, 400);
                    return;
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
                response_utility_1.ResponseUtil.success(res, { valid: true, quizCode: quizCodeData }, result.message);
            }
            catch (error) {
                if (error.name === 'ZodError') {
                    response_utility_1.ResponseUtil.error(res, 'Validation failed', 400, error);
                    return;
                }
                response_utility_1.ResponseUtil.error(res, 'Failed to validate quiz code', 500, error);
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
        this.useQuizCode = async (req, res) => {
            try {
                const user = req.user;
                if (user.role !== 'benfek') {
                    response_utility_1.ResponseUtil.error(res, 'Only benfeks can use quiz codes', 403);
                    return;
                }
                const { code } = quiz_dto_1.UseQuizCodeSchema.parse(req.body);
                const validation = await this.quizCodeRepository.validateCode(code.toUpperCase());
                if (!validation.valid) {
                    response_utility_1.ResponseUtil.error(res, validation.message, 400);
                    return;
                }
                const updated = await this.quizCodeRepository.markAsUsed(code.toUpperCase(), user.id);
                response_utility_1.ResponseUtil.success(res, updated, 'Quiz code used successfully');
            }
            catch (error) {
                if (error.name === 'ZodError') {
                    response_utility_1.ResponseUtil.error(res, 'Validation failed', 400, error);
                    return;
                }
                response_utility_1.ResponseUtil.error(res, 'Failed to use quiz code', 500, error);
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
        this.getMyQuizCodes = async (req, res) => {
            try {
                const user = req.user;
                if (user.role !== 'principal') {
                    response_utility_1.ResponseUtil.error(res, 'Only principals can view quiz codes', 403);
                    return;
                }
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 10;
                const skip = (page - 1) * limit;
                const result = await this.quizCodeRepository.findByCreator(user.id, skip, limit);
                response_utility_1.ResponseUtil.success(res, {
                    codes: result.codes,
                    pagination: {
                        page,
                        limit,
                        total: result.total,
                        totalPages: Math.ceil(result.total / limit),
                    },
                }, 'Quiz codes retrieved successfully');
            }
            catch (error) {
                response_utility_1.ResponseUtil.error(res, 'Failed to retrieve quiz codes', 500, error);
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
        this.getMyBenfeks = async (req, res) => {
            try {
                const user = req.user;
                if (user.role !== 'principal') {
                    response_utility_1.ResponseUtil.error(res, 'Only principals can view benfeks', 403);
                    return;
                }
                const name = req.query.name || req.query.benfekName || undefined;
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 10;
                const skip = (page - 1) * limit;
                const result = await this.quizCodeRepository.findBenfeksByCreator(user.id, name, skip, limit);
                const benfeks = result.codes.map(code => ({
                    id: code.id,
                    code: code.code,
                    benfekName: code.benfekName,
                    benfekPhone: code.benfekPhone,
                    registrationStatus: code.isUsed ? 'registered' : 'not_registered',
                    usedAt: code.usedAt,
                }));
                response_utility_1.ResponseUtil.success(res, {
                    benfeks,
                    pagination: {
                        page,
                        limit,
                        total: result.total,
                        totalPages: Math.ceil(result.total / limit),
                    },
                }, 'Benfeks retrieved successfully');
            }
            catch (error) {
                response_utility_1.ResponseUtil.error(res, 'Failed to retrieve benfeks', 500, error);
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
        this.getBenfekQuizByCode = async (req, res) => {
            try {
                const user = req.user;
                if (user.role !== 'principal') {
                    response_utility_1.ResponseUtil.error(res, 'Only principals can view benfek quiz data', 403);
                    return;
                }
                const code = (req.params.code || '').toUpperCase();
                const quizCode = await this.quizCodeRepository.findByCode(code);
                if (!quizCode || quizCode.createdBy !== user.id) {
                    response_utility_1.ResponseUtil.error(res, 'Quiz code not found', 404);
                    return;
                }
                response_utility_1.ResponseUtil.success(res, quizCode, 'Quiz data retrieved successfully');
            }
            catch (error) {
                response_utility_1.ResponseUtil.error(res, 'Failed to retrieve quiz data', 500, error);
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
        this.deleteQuizCode = async (req, res) => {
            try {
                const user = req.user;
                if (user.role !== 'principal') {
                    response_utility_1.ResponseUtil.error(res, 'Only principals can delete quiz codes', 403);
                    return;
                }
                const id = parseInt(req.params.id);
                await this.quizCodeRepository.delete(id);
                response_utility_1.ResponseUtil.success(res, null, 'Quiz code deleted successfully');
            }
            catch (error) {
                response_utility_1.ResponseUtil.error(res, 'Failed to delete quiz code', 500, error);
            }
        };
    }
};
exports.QuizCodeController = QuizCodeController;
exports.QuizCodeController = QuizCodeController = __decorate([
    (0, inversify_1.injectable)(),
    __param(1, (0, inversify_1.inject)(quizcode_repository_1.QuizCodeRepository)),
    __metadata("design:paramtypes", [inversify_2.Container,
        quizcode_repository_1.QuizCodeRepository])
], QuizCodeController);
//# sourceMappingURL=quizcode.controller.js.map