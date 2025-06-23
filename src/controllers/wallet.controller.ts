import { inject, injectable } from 'inversify';
import { Response } from 'express';
import { WithdrawalSchema } from '../DTOs/wallet.dto';
import { BaseController } from './base.controller';
import { WalletService } from '../services/wallet.service';
import { ResponseUtil } from '../utilities/response.utility';
import { Container } from 'inversify';
import type { Role } from '.prisma/client';
import { AuthenticatedRequest } from '../types/auth.types';

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     BearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     Wallet:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         balance:
 *           type: number
 *           format: float
 *         userId:
 *           type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       required:
 *         - id
 *         - balance
 *         - userId
 *         - createdAt
 *         - updatedAt
 *     Withdrawal:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         amount:
 *           type: number
 *           format: float
 *         userId:
 *           type: integer
 *         walletId:
 *           type: integer
 *         status:
 *           type: string
 *           enum: [pending, completed, failed]
 *         bankName:
 *           type: string
 *         accountNumber:
 *           type: string
 *         accountName:
 *           type: string
 *         month:
 *           type: integer
 *         year:
 *           type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       required:
 *         - id
 *         - amount
 *         - userId
 *         - walletId
 *         - status
 *         - bankName
 *         - accountNumber
 *         - accountName
 *         - month
 *         - year
 *         - createdAt
 *         - updatedAt
 *     WithdrawalRequest:
 *       type: object
 *       properties:
 *         amount:
 *           type: number
 *           format: float
 *           minimum: 0
 *           exclusiveMinimum: true
 *         bankName:
 *           type: string
 *           minLength: 2
 *         accountNumber:
 *           type: string
 *           minLength: 10
 *         accountName:
 *           type: string
 *           minLength: 2
 *       required:
 *         - amount
 *         - bankName
 *         - accountNumber
 *         - accountName
 */

@injectable()
export class WalletController extends BaseController {
  constructor(
    container: Container,
    @inject(WalletService) private walletService: WalletService
  ) {
    super(container);
  }

  /**
   * @swagger
   * /api/v2/wallet:
   *   get:
   *     tags: [Wallet]
   *     summary: Get user's wallet
   *     security:
   *       - BearerAuth: []
   *     responses:
   *       200:
   *         description: Wallet details retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 wallet:
   *                   $ref: '#/components/schemas/Wallet'
   *       404:
   *         description: Wallet not found
   */
  async getWallet(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user.id;
      const wallet = await this.walletService.getWallet(userId);
      if (!wallet) {
        return ResponseUtil.error(res, 'Wallet not found', 404);
      }
      return ResponseUtil.success(res, { wallet });
    } catch (error) {
      return ResponseUtil.error(res, error as string);
    }
  }

  /**
   * @swagger
   * /api/v2/wallet/withdrawals:
   *   post:
   *     tags: [Wallet]
   *     summary: Request a withdrawal
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/WithdrawalRequest'
   *     responses:
   *       200:
   *         description: Withdrawal request created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 withdrawal:
   *                   $ref: '#/components/schemas/Withdrawal'
   *       400:
   *         description: Invalid input data
   *       404:
   *         description: Wallet not found
   */
  async requestWithdrawal(req: AuthenticatedRequest, res: Response) {
    try {
      const withdrawalData = WithdrawalSchema.parse(req.body);
      const userId = req.user.id;
      const userRole = req.user.role as Role;
      const wallet = await this.walletService.getWallet(userId);

      if (!wallet) {
        return ResponseUtil.error(res, 'Wallet not found', 404);
      }

      const withdrawal = await this.walletService.requestWithdrawal(
        userId,
        userRole,
        wallet.id,
        withdrawalData
      );

      return ResponseUtil.success(res, { withdrawal });
    } catch (error) {
      return ResponseUtil.error(res, error as string);
    }
  }

  /**
   * @swagger
   * /api/v2/wallet/withdrawals:
   *   get:
   *     tags: [Wallet]
   *     summary: Get user's withdrawals
   *     security:
   *       - BearerAuth: []
   *     responses:
   *       200:
   *         description: List of withdrawals retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 withdrawals:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Withdrawal'
   */
  async getWithdrawals(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user.id;
      const withdrawals = await this.walletService.getWithdrawals(userId);
      return ResponseUtil.success(res, { withdrawals });
    } catch (error) {
      return ResponseUtil.error(res, error as string);
    }
  }

  /**
   * @swagger
   * /api/v2/wallet/withdrawals/{id}:
   *   get:
   *     tags: [Wallet]
   *     summary: Get withdrawal by ID
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
   *         description: Withdrawal details retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 withdrawal:
   *                   $ref: '#/components/schemas/Withdrawal'
   *       403:
   *         description: Unauthorized
   *       404:
   *         description: Withdrawal not found
   */
  async getWithdrawalById(req: AuthenticatedRequest, res: Response) {
    try {
      const withdrawalId = parseInt(req.params.id);
      const withdrawal = await this.walletService.getWithdrawalById(withdrawalId);
      
      if (!withdrawal) {
        return ResponseUtil.error(res, 'Withdrawal not found', 404);
      }

      // Ensure user can only view their own withdrawals
      if (withdrawal.userId !== req.user.id) {
        return ResponseUtil.error(res, 'Unauthorized', 403);
      }

      return ResponseUtil.success(res, { withdrawal });
    } catch (error) {
      return ResponseUtil.error(res, error as string);
    }
  }
}