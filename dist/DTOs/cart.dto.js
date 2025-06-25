"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateCartItemSchema = exports.AddToCartSchema = void 0;
const zod_1 = require("zod");
exports.AddToCartSchema = zod_1.z.object({
    supplementId: zod_1.z.number().positive('Invalid supplement ID'),
    quantity: zod_1.z.number().positive('Quantity must be positive'),
});
exports.UpdateCartItemSchema = zod_1.z.object({
    quantity: zod_1.z.number().positive('Quantity must be positive'),
});
//# sourceMappingURL=cart.dto.js.map