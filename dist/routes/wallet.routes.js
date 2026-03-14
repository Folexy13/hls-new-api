"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWalletRoutes = void 0;
const express_1 = require("express");
const wallet_controller_1 = require("../controllers/wallet.controller");
const auth_guard_1 = require("../middlewares/auth.guard");
const response_utility_1 = require("../utilities/response.utility");
const createWalletRoutes = (container) => {
    const router = (0, express_1.Router)();
    const walletController = container.get(wallet_controller_1.WalletController);
    const authGuard = container.get(auth_guard_1.AuthGuard);
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
    router.get('/', authGuard.verify(), (0, response_utility_1.authenticatedHandler)(walletController.getWallet.bind(walletController)));
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
    router.post('/withdrawals', authGuard.verify(), (0, response_utility_1.authenticatedHandler)(walletController.requestWithdrawal.bind(walletController)));
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
    router.get('/withdrawals', authGuard.verify(), (0, response_utility_1.authenticatedHandler)(walletController.getWithdrawals.bind(walletController)));
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
    router.get('/withdrawals/:id', authGuard.verify(), (0, response_utility_1.authenticatedHandler)(walletController.getWithdrawalById.bind(walletController)));
    return router;
};
exports.createWalletRoutes = createWalletRoutes;
//# sourceMappingURL=wallet.routes.js.map