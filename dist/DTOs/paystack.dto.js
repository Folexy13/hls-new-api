"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaystackInitializeSchema = void 0;
const zod_1 = require("zod");
exports.PaystackInitializeSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    amount: zod_1.z.number().positive(), // amount in kobo
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
//# sourceMappingURL=paystack.dto.js.map