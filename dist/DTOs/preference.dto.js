"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdatePreferenceSchema = exports.CreatePreferenceSchema = void 0;
const zod_1 = require("zod");
exports.CreatePreferenceSchema = zod_1.z.object({
    drugForm: zod_1.z.string().min(1),
    minBudget: zod_1.z.number().min(0),
    maxBudget: zod_1.z.number().min(0),
});
exports.UpdatePreferenceSchema = zod_1.z.object({
    drugForm: zod_1.z.string().min(1).optional(),
    minBudget: zod_1.z.number().min(0).optional(),
    maxBudget: zod_1.z.number().min(0).optional(),
});
//# sourceMappingURL=preference.dto.js.map