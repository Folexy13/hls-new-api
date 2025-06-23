import { Response, Request, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AuthenticatedRequest } from '../types/auth.types';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code: string;
    details?: any;
  };
  meta?: {
    pagination?: PaginationMeta;
  };
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export class ResponseUtil {
  static success<T>(
    res: Response,
    data: T,
    message: string = 'Operation successful',
    statusCode: number = 200,
    meta?: { pagination?: PaginationMeta }
  ): Response {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      meta
    });
  }

  static error(
    res: Response,
    message: string = 'Operation failed',
    statusCode: number = 500,
    error?: any
  ): Response {
    const errorResponse: ApiResponse<null> = {
      success: false,
      message,
      error: {
        code: this.getErrorCode(statusCode),
        details: this.formatError(error)
      }
    };

    return res.status(statusCode).json(errorResponse);
  }

  private static formatError(error: any): any {
    if (error instanceof ZodError) {
      return error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: 'VALIDATION_ERROR'
      }));
    }

    if (error instanceof Error) {
      return {
        message: error.message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      };
    }

    return error;
  }

  private static getErrorCode(statusCode: number): string {
    const errorCodes: Record<number, string> = {
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

export function authenticatedHandler(
  handler: (req: AuthenticatedRequest, res: Response) => Promise<Response>
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    handler(req as AuthenticatedRequest, res).catch(next);
  };
}
