"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateLifestyleSchema = exports.CreateLifestyleSchema = void 0;
const zod_1 = require("zod");
exports.CreateLifestyleSchema = zod_1.z.object({
    habit: zod_1.z.string().min(1),
    fun: zod_1.z.string().min(1),
    routine: zod_1.z.string().min(1),
    career: zod_1.z.string().min(1),
});
exports.UpdateLifestyleSchema = zod_1.z.object({
    habit: zod_1.z.string().min(1).optional(),
    fun: zod_1.z.string().min(1).optional(),
    routine: zod_1.z.string().min(1).optional(),
    career: zod_1.z.string().min(1).optional(),
});
//# sourceMappingURL=lifestyle.dto.js.map