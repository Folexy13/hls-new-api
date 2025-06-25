"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateSupplementSchema = exports.CreateSupplementSchema = void 0;
const zod_1 = require("zod");
exports.CreateSupplementSchema = zod_1.z.object({
    name: zod_1.z.string().min(3, 'Name must be at least 3 characters'),
    description: zod_1.z.string().min(10, 'Description must be at least 10 characters'),
    price: zod_1.z.number().positive('Price must be positive'),
    stock: zod_1.z.number().nonnegative('Stock cannot be negative'),
    image: zod_1.z.string().optional(),
});
exports.UpdateSupplementSchema = exports.CreateSupplementSchema.partial();
//# sourceMappingURL=supplement.dto.js.map