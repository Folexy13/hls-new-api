import { PaginationMeta } from './response.utility';

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    pagination: PaginationMeta;
  };
}

export class PaginationUtil {
  static getPaginationMetadata(
    total: number,
    page: number,
    limit: number
  ): PaginationMeta {
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

  static getSkipTake(options: PaginationOptions): { skip: number; take: number } {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(options.limit || 10, 100)); // Max 100 items per page
    const skip = (page - 1) * limit;

    return { skip, take: limit };
  }
}
