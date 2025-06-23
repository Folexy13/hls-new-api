import { Router } from 'express';
import { Container } from 'inversify';
import { WalletController } from '../controllers/wallet.controller';
import { AuthGuard } from '../middlewares/auth.guard';
import { authenticatedHandler } from '../utilities/response.utility';

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
  router.get(
    '/',
    authGuard.verify(),
    authenticatedHandler(walletController.getWallet.bind(walletController))
  );

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
  router.post(
    '/withdrawals',
    authGuard.verify(),
    authenticatedHandler(walletController.requestWithdrawal.bind(walletController))
  );

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
  router.get(
    '/withdrawals',
    authGuard.verify(),
    authenticatedHandler(walletController.getWithdrawals.bind(walletController))
  );

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
  router.get(
    '/withdrawals/:id',
    authGuard.verify(),
    authenticatedHandler(walletController.getWithdrawalById.bind(walletController))
  );

  return router;
};
