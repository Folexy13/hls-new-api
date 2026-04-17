import { Request, RequestHandler, Response } from 'express';
import { injectable, inject } from 'inversify';
import { ZodError } from 'zod';
import { BaseController } from './base.controller';
import { AuthService } from '../services/auth.service';
import { ResponseUtil } from '../utilities/response.utility';
import {
  LoginUserSchema,
  RegisterUserSchema,
  RefreshTokenSchema,
  RegisterBenfekSchema,
  RegisterUnreferredBenfekSchema
} from '../DTOs/auth.dto';
import { Container } from 'inversify';
import { AppError } from '../utilities/errors';

@injectable()
export class AuthController extends BaseController {
  constructor(
    container: Container,
    @inject(AuthService) private authService: AuthService
  ) {
    super(container);
  }

  /**
   * @swagger
   * /api/v2/auth/register:
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
  register:RequestHandler = async (req: Request, res: Response) => {
    try {
      const data = RegisterUserSchema.parse(req.body);
      const user = await this.authService.register(data);
      return ResponseUtil.success(res, user, 'User registered successfully', 201);
    } catch (error) {
      if (error instanceof ZodError) {
        return ResponseUtil.error(res, 'Validation failed', 400, error);
      }
      if (error instanceof AppError) {
        return ResponseUtil.error(res, error.message, error.statusCode, error);
      }
      return ResponseUtil.error(res, 'Registration failed', 500, error);
    }
  }

  /**
   * @swagger
   * /api/v2/auth/register-benfek:
   *   post:
   *     summary: Register a new benfek user
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - username
   *               - email
   *               - password
   *               - confirmPassword
   *             properties:
   *               username:
   *                 type: string
   *               email:
   *                 type: string
   *                 format: email
   *               password:
   *                 type: string
   *                 minLength: 8
   *               confirmPassword:
   *                 type: string
   *     responses:
   *       201:
   *         description: Benfek registered successfully
   *       400:
   *         description: Validation error
   *       409:
   *         description: User already exists
   */
  registerBenfek: RequestHandler = async (req: Request, res: Response) => {
    try {
      const data = RegisterBenfekSchema.parse(req.body);
      const user = await this.authService.registerBenfek(data);
      return ResponseUtil.success(res, user, 'Benfek registered successfully', 201);
    } catch (error) {
      if (error instanceof ZodError) {
        return ResponseUtil.error(res, 'Validation failed', 400, error);
      }
      if (error instanceof AppError) {
        return ResponseUtil.error(res, error.message, error.statusCode, error);
      }
      return ResponseUtil.error(res, 'Registration failed', 500, error);
    }
  }

  registerUnreferredBenfek: RequestHandler = async (req: Request, res: Response) => {
    try {
      const data = RegisterUnreferredBenfekSchema.parse(req.body);
      const result = await this.authService.registerUnreferredBenfek(data);
      return ResponseUtil.success(res, result, 'Benfek registered successfully', 201);
    } catch (error) {
      if (error instanceof ZodError) {
        return ResponseUtil.error(res, 'Validation failed', 400, error);
      }
      if (error instanceof AppError) {
        return ResponseUtil.error(res, error.message, error.statusCode, error);
      }
      return ResponseUtil.error(res, 'Registration failed', 500, error);
    }
  }

  /**
   * @swagger
   * /api/v2/auth/login:
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
  login:RequestHandler = async (req: Request, res: Response) => {
    try {
      const data = LoginUserSchema.parse(req.body);
      const result = await this.authService.login(data);
      return ResponseUtil.success(res, result, 'Login successful');
    } catch (error) {
      if (error instanceof ZodError) {
        return ResponseUtil.error(res, 'Validation failed', 400, error);
      }
      if (error instanceof AppError) {
        return ResponseUtil.error(res, error.message, error.statusCode, error);
      }
      return ResponseUtil.error(res, 'Login failed', 500, error);
    }
  }

  /**
   * @swagger
   * /qpi/v2/auth/refresh:
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
  refreshToken:RequestHandler = async (req: Request, res: Response) => {
    try {
      const { refreshToken } = RefreshTokenSchema.parse(req.body);
      const tokens = await this.authService.refreshToken(refreshToken);
      return ResponseUtil.success(res, tokens, 'Tokens refreshed successfully');
    } catch (error) {
      if (error instanceof ZodError) {
        return ResponseUtil.error(res, 'Validation failed', 400, error);
      }
      if (error instanceof AppError) {
        return ResponseUtil.error(res, error.message, error.statusCode, error);
      }
      return ResponseUtil.error(res, 'Token refresh failed', 500, error);
    }
  }

  /**
   * @swagger
   * /api/v2/auth/logout:
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
  logout: RequestHandler = async (req: Request, res: Response) => {
    try {
      const { refreshToken } = RefreshTokenSchema.parse(req.body);
      await this.authService.logout(refreshToken);
      return ResponseUtil.success(res, null, 'Logged out successfully');
    } catch (error) {
      if (error instanceof ZodError) {
        return ResponseUtil.error(res, 'Validation failed', 400, error);
      }
      if (error instanceof AppError) {
        return ResponseUtil.error(res, error.message, error.statusCode, error);
      }
      return ResponseUtil.error(res, 'Logout failed', 500, error);
    }
  }
}
