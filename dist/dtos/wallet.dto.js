"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WithdrawalSchema = void 0;
const zod_1 = require("zod");
exports.WithdrawalSchema = zod_1.z.object({
    amount: zod_1.z.number().positive('Amount must be positive'),
    bankName: zod_1.z.string().min(2, 'Bank name must be at least 2 characters'),
    accountNumber: zod_1.z.string().min(10, 'Invalid account number'),
    accountName: zod_1.z.string().min(2, 'Account name must be at least 2 characters'),
});
