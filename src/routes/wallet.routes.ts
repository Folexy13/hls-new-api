import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'inversify';
import { WalletController } from '../controllers/wallet.controller';
import { AuthGuard } from '../middlewares/auth.guard';
import type { AuthenticatedRequest } from '../types/auth.types';

export const createWalletRoutes = (container: Container): Router => {
  const router = Router();
  const walletController = container.get(WalletController);
  const authGuard = container.get(AuthGuard);

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
   */
  router.get('/', authGuard.verify(), (req: Request, res: Response) => {
    return walletController.getWallet(req as AuthenticatedRequest, res);
  });

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
   */
  router.post('/withdrawals', authGuard.verify(), (req: Request, res: Response) => {
    return walletController.requestWithdrawal(req as AuthenticatedRequest, res);
  });

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
   */
  router.get('/withdrawals', authGuard.verify(), (req: Request, res: Response) => {
    return walletController.getWithdrawals(req as AuthenticatedRequest, res);
  });

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
   */
  router.get('/withdrawals/:id', authGuard.verify(), (req: Request, res: Response) => {
    return walletController.getWithdrawalById(req as AuthenticatedRequest, res);
  });

  return router;
};
