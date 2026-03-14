"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaginationUtil = void 0;
class PaginationUtil {
    static getPaginationMetadata(total, page, limit) {
        const totalPages = Math.ceil(total / limit);
        return {
            total,
            page,
            limit,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        };
    }
    static getSkipTake(options) {
        const page = Math.max(1, options.page || 1);
        const limit = Math.max(1, Math.min(options.limit || 10, 100)); // Max 100 items per page
        const skip = (page - 1) * limit;
        return { skip, take: limit };
    }
}
exports.PaginationUtil = PaginationUtil;
//# sourceMappingURL=pagination.utility.js.map