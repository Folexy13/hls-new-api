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
   * /api/v2/wallet/resolve-account:
   *   get:
   *     tags: [Wallet]
   *     summary: Resolve bank account details
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - name: bankName
   *         in: query
   *         required: true
   *         schema:
   *           type: string
   *       - name: accountNumber
   *         in: query
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Bank account resolved successfully
   */
  router.get(
    '/withdrawals',
    authGuard.verify(),
    authenticatedHandler(walletController.getWithdrawals.bind(walletController))
  );

  /**
   * @swagger
   * /api/v2/wallet/banks:
   *   get:
   *     tags: [Wallet]
   *     summary: Get supported banks
   *     security:
   *       - BearerAuth: []
   *     responses:
   *       200:
   *         description: Banks retrieved successfully
   */
  router.get(
    '/banks',
    authGuard.verify(),
    authenticatedHandler(walletController.getBanks.bind(walletController))
  );

  /**
   * @swagger
   * /api/v2/wallet/resolve-account:
   *   get:
   *     tags: [Wallet]
   *     summary: Resolve bank account details
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - name: bankName
   *         in: query
   *         required: true
   *         schema:
   *           type: string
   *       - name: accountNumber
   *         in: query
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Bank account resolved successfully
   */
  router.get(
    '/resolve-account',
    authGuard.verify(),
    authenticatedHandler(walletController.resolveBankAccount.bind(walletController))
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
