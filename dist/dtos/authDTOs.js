"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePasswordDTO = exports.resetPasswordDTO = exports.forgotPasswordDTO = exports.signUpDTO = exports.signInDTO = void 0;
exports.signInDTO = {
    email: {
        type: "string",
        format: "email",
        example: "user@example.com",
    },
    password: {
        type: "string",
        minLength: 6,
        example: "password123",
    },
};
exports.signUpDTO = {
    name: {
        type: "string",
        minLength: 1,
        example: "John Doe",
    },
    email: {
        type: "string",
        format: "email",
        example: "john@example.com",
    },
    password: {
        type: "string",
        minLength: 6,
        example: "password123",
    },
};
exports.forgotPasswordDTO = {
    email: {
        type: "string",
        format: "email",
        example: "john@example.com",
    },
};
exports.resetPasswordDTO = {
    otp: {
        type: "string",
        example: "123456",
    },
    password: {
        type: "string",
        minLength: 6,
        example: "newpassword123",
    },
};
exports.changePasswordDTO = {
    oldPassword: {
        type: "string",
        minLength: 6,
        example: "oldpassword123",
    },
    newPassword: {
        type: "string",
        minLength: 6,
        example: "newpassword123",
    },
};
