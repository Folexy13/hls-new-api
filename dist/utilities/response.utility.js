"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseUtil = void 0;
exports.authenticatedHandler = authenticatedHandler;
const zod_1 = require("zod");
class ResponseUtil {
    static success(res, data, message = 'Operation successful', statusCode = 200, meta) {
        return res.status(statusCode).json({
            success: true,
            message,
            data,
            meta
        });
    }
    static error(res, message = 'Operation failed', statusCode = 500, error) {
        const errorResponse = {
            success: false,
            message,
            error: {
                code: this.getErrorCode(statusCode),
                details: this.formatError(error)
            }
        };
        return res.status(statusCode).json(errorResponse);
    }
    static formatError(error) {
        if (error instanceof zod_1.ZodError) {
            return error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message,
                code: 'VALIDATION_ERROR'
            }));
        }
        if (error instanceof Error) {
            return Object.assign({ message: error.message }, (process.env.NODE_ENV === 'development' && { stack: error.stack }));
        }
        return error;
    }
    static getErrorCode(statusCode) {
        const errorCodes = {
            400: 'BAD_REQUEST',
            401: 'UNAUTHORIZED',
            403: 'FORBIDDEN',
            404: 'NOT_FOUND',
            409: 'CONFLICT',
            422: 'VALIDATION_ERROR',
            500: 'INTERNAL_SERVER_ERROR'
        };
        return errorCodes[statusCode] || 'UNKNOWN_ERROR';
    }
}
exports.ResponseUtil = ResponseUtil;
function authenticatedHandler(handler) {
    return (req, res, next) => {
        handler(req, res).catch(next);
    };
}
