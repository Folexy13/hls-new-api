"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateBasicSchema = exports.CreateBasicSchema = void 0;
const zod_1 = require("zod");
exports.CreateBasicSchema = zod_1.z.object({
    gender: zod_1.z.string().min(1),
    nickname: zod_1.z.string().optional(),
    age: zod_1.z.string().min(1),
    weight: zod_1.z.string().min(1),
    height: zod_1.z.string().min(1),
});
exports.UpdateBasicSchema = zod_1.z.object({
    gender: zod_1.z.string().min(1).optional(),
    nickname: zod_1.z.string().optional(),
    age: zod_1.z.string().min(1).optional(),
    weight: zod_1.z.string().min(1).optional(),
    height: zod_1.z.string().min(1).optional(),
});
//# sourceMappingURL=basic.dto.js.map