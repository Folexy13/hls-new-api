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
exports.AuthController = void 0;
const inversify_1 = require("inversify");
const zod_1 = require("zod");
const base_controller_1 = require("./base.controller");
const auth_service_1 = require("../services/auth.service");
const response_utility_1 = require("../utilities/response.utility");
const auth_dto_1 = require("../DTOs/auth.dto");
const inversify_2 = require("inversify");
const errors_1 = require("../utilities/errors");
let AuthController = class AuthController extends base_controller_1.BaseController {
    constructor(container, authService) {
        super(container);
        this.authService = authService;
        /**
         * @swagger
         * /auth/register:
         *   post:
         *     summary: Register a new user
         *     tags: [Auth]
         *     requestBody:
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *             type: object
         *             required:
         *               - email
         *               - password
         *               - firstName
         *               - lastName
         *             properties:
         *               email:
         *                 type: string
         *                 format: email
         *               password:
         *                 type: string
         *                 minLength: 8
         *               firstName:
         *                 type: string
         *               lastName:
         *                 type: string
         *     responses:
         *       201:
         *         description: User successfully registered
         *       400:
         *         description: Validation error
         *       409:
         *         description: User already exists
         */
        this.register = async (req, res) => {
            try {
                const data = auth_dto_1.RegisterUserSchema.parse(req.body);
                const user = await this.authService.register(data);
                response_utility_1.ResponseUtil.success(res, user, 'User registered successfully', 201);
            }
            catch (error) {
                if (error instanceof zod_1.ZodError) {
                    response_utility_1.ResponseUtil.error(res, 'Validation failed', 400, error);
                }
                if (error instanceof errors_1.AppError) {
                    response_utility_1.ResponseUtil.error(res, error.message, error.statusCode, error);
                }
                response_utility_1.ResponseUtil.error(res, 'Registration failed', 500, error);
            }
        };
        /**
         * @swagger
         * /auth/login:
         *   post:
         *     summary: Login user
         *     tags: [Auth]
         *     requestBody:
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *             type: object
         *             required:
         *               - email
         *               - password
         *             properties:
         *               email:
         *                 type: string
         *                 format: email
         *               password:
         *                 type: string
         *     responses:
         *       200:
         *         description: Login successful
         *       400:
         *         description: Validation error
         *       401:
         *         description: Invalid credentials
         */
        this.login = async (req, res) => {
            try {
                const data = auth_dto_1.LoginUserSchema.parse(req.body);
                const result = await this.authService.login(data);
                response_utility_1.ResponseUtil.success(res, result, 'Login successful');
            }
            catch (error) {
                if (error instanceof zod_1.ZodError) {
                    response_utility_1.ResponseUtil.error(res, 'Validation failed', 400, error);
                }
                if (error instanceof errors_1.AppError) {
                    response_utility_1.ResponseUtil.error(res, error.message, error.statusCode, error);
                }
                response_utility_1.ResponseUtil.error(res, 'Login failed', 500, error);
            }
        };
        /**
         * @swagger
         * /auth/refresh:
         *   post:
         *     summary: Refresh access token
         *     tags: [Auth]
         *     requestBody:
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *             type: object
         *             required:
         *               - refreshToken
         *             properties:
         *               refreshToken:
         *                 type: string
         *     responses:
         *       200:
         *         description: Tokens refreshed successfully
         *       401:
         *         description: Invalid refresh token
         */
        this.refreshToken = async (req, res) => {
            try {
                const { refreshToken } = auth_dto_1.RefreshTokenSchema.parse(req.body);
                const tokens = await this.authService.refreshToken(refreshToken);
                response_utility_1.ResponseUtil.success(res, tokens, 'Tokens refreshed successfully');
            }
            catch (error) {
                if (error instanceof zod_1.ZodError) {
                    response_utility_1.ResponseUtil.error(res, 'Validation failed', 400, error);
                }
                if (error instanceof errors_1.AppError) {
                    response_utility_1.ResponseUtil.error(res, error.message, error.statusCode, error);
                }
                response_utility_1.ResponseUtil.error(res, 'Token refresh failed', 500, error);
            }
        };
        /**
         * @swagger
         * /auth/logout:
         *   post:
         *     summary: Logout user
         *     tags: [Auth]
         *     requestBody:
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *             type: object
         *             required:
         *               - refreshToken
         *             properties:
         *               refreshToken:
         *                 type: string
         *     responses:
         *       200:
         *         description: Logged out successfully
         *       401:
         *         description: Invalid refresh token
         */
        this.logout = async (req, res) => {
            try {
                const { refreshToken } = auth_dto_1.RefreshTokenSchema.parse(req.body);
                await this.authService.logout(refreshToken);
                response_utility_1.ResponseUtil.success(res, null, 'Logged out successfully');
            }
            catch (error) {
                if (error instanceof zod_1.ZodError) {
                    response_utility_1.ResponseUtil.error(res, 'Validation failed', 400, error);
                }
                if (error instanceof errors_1.AppError) {
                    response_utility_1.ResponseUtil.error(res, error.message, error.statusCode, error);
                }
                response_utility_1.ResponseUtil.error(res, 'Logout failed', 500, error);
            }
        };
    }
};
exports.AuthController = AuthController;
exports.AuthController = AuthController = __decorate([
    (0, inversify_1.injectable)(),
    __param(1, (0, inversify_1.inject)(auth_service_1.AuthService)),
    __metadata("design:paramtypes", [inversify_2.Container,
        auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map