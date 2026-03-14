"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetNutrientTypeByCodeSchema = exports.UpdateNutrientTypeSchema = exports.CreateNutrientTypeSchema = void 0;
const zod_1 = require("zod");
const basic_dto_1 = require("./basic.dto");
const lifestyle_dto_1 = require("./lifestyle.dto");
const preference_dto_1 = require("./preference.dto");
exports.CreateNutrientTypeSchema = zod_1.z.object({
    code: zod_1.z.string().min(1, 'Code is required'),
    userId: zod_1.z.number().int().positive('User ID must be a positive integer'),
    basic: basic_dto_1.CreateBasicSchema.optional(),
    lifestyle: lifestyle_dto_1.CreateLifestyleSchema.optional(),
    preference: preference_dto_1.CreatePreferenceSchema.optional(),
});
exports.UpdateNutrientTypeSchema = zod_1.z.object({
    code: zod_1.z.string().min(1).optional(),
    basic: basic_dto_1.CreateBasicSchema.partial().optional(),
    lifestyle: lifestyle_dto_1.CreateLifestyleSchema.partial().optional(),
    preference: preference_dto_1.CreatePreferenceSchema.partial().optional(),
});
exports.GetNutrientTypeByCodeSchema = zod_1.z.object({
    code: zod_1.z.string().min(1, 'Code is required'),
});
//# sourceMappingURL=nutrienttype.dto.js.map