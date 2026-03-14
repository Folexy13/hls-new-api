"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefreshTokenSchema = exports.LoginUserSchema = exports.RegisterUserSchema = void 0;
const zod_1 = require("zod");
exports.RegisterUserSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format').transform(val => val.trim()),
    password: zod_1.z
        .string()
        .transform(val => val.trim())
        .refine(val => val.length >= 8, 'Password must be at least 8 characters')
        .refine(val => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/.test(val), 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    firstName: zod_1.z.string().min(2, 'First name must be at least 2 characters').transform(val => val.trim()),
    lastName: zod_1.z.string().min(2, 'Last name must be at least 2 characters').transform(val => val.trim()),
    role: zod_1.z.enum(['benfek', 'principal', 'wholesaler', 'pharmacy', 'researcher']).optional().default('benfek')
});
exports.LoginUserSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    password: zod_1.z.string().min(1, 'Password is required')
});
exports.RefreshTokenSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, 'Refresh token is required')
});
//# sourceMappingURL=auth.dto.js.map