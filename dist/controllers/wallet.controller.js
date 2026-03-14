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
exports.WalletController = void 0;
const inversify_1 = require("inversify");
const wallet_dto_1 = require("../DTOs/wallet.dto");
const base_controller_1 = require("./base.controller");
const wallet_service_1 = require("../services/wallet.service");
const response_utility_1 = require("../utilities/response.utility");
const inversify_2 = require("inversify");
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
let WalletController = class WalletController extends base_controller_1.BaseController {
    constructor(container, walletService) {
        super(container);
        this.walletService = walletService;
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
    async getWallet(req, res) {
        try {
            const userId = req.user.id;
            const wallet = await this.walletService.getWallet(userId);
            if (!wallet) {
                return response_utility_1.ResponseUtil.error(res, 'Wallet not found', 404);
            }
            return response_utility_1.ResponseUtil.success(res, { wallet });
        }
        catch (error) {
            return response_utility_1.ResponseUtil.error(res, error);
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
    async requestWithdrawal(req, res) {
        try {
            const withdrawalData = wallet_dto_1.WithdrawalSchema.parse(req.body);
            const userId = req.user.id;
            const userRole = req.user.role;
            const wallet = await this.walletService.getWallet(userId);
            if (!wallet) {
                return response_utility_1.ResponseUtil.error(res, 'Wallet not found', 404);
            }
            const withdrawal = await this.walletService.requestWithdrawal(userId, userRole, wallet.id, withdrawalData);
            return response_utility_1.ResponseUtil.success(res, { withdrawal });
        }
        catch (error) {
            return response_utility_1.ResponseUtil.error(res, error);
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
    async getWithdrawals(req, res) {
        try {
            const userId = req.user.id;
            const withdrawals = await this.walletService.getWithdrawals(userId);
            return response_utility_1.ResponseUtil.success(res, { withdrawals });
        }
        catch (error) {
            return response_utility_1.ResponseUtil.error(res, error);
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
    async getWithdrawalById(req, res) {
        try {
            const withdrawalId = parseInt(req.params.id);
            const withdrawal = await this.walletService.getWithdrawalById(withdrawalId);
            if (!withdrawal) {
                return response_utility_1.ResponseUtil.error(res, 'Withdrawal not found', 404);
            }
            // Ensure user can only view their own withdrawals
            if (withdrawal.userId !== req.user.id) {
                return response_utility_1.ResponseUtil.error(res, 'Unauthorized', 403);
            }
            return response_utility_1.ResponseUtil.success(res, { withdrawal });
        }
        catch (error) {
            return response_utility_1.ResponseUtil.error(res, error);
        }
    }
};
exports.WalletController = WalletController;
exports.WalletController = WalletController = __decorate([
    (0, inversify_1.injectable)(),
    __param(1, (0, inversify_1.inject)(wallet_service_1.WalletService)),
    __metadata("design:paramtypes", [inversify_2.Container,
        wallet_service_1.WalletService])
], WalletController);
//# sourceMappingURL=wallet.controller.js.map