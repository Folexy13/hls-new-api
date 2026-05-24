import { Response, Request, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AuthenticatedRequest } from '../types/auth.types';
import { AppError } from './errors';

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
  private static readonly defaultMessages: Record<number, string> = {
    400: 'Please check your request and try again.',
    401: 'Please sign in to continue.',
    403: 'You do not have permission to perform this action.',
    404: 'We could not find what you requested.',
    409: 'This information already exists.',
    422: 'Please check the highlighted fields and try again.',
    429: 'Too many attempts. Please wait a moment and try again.',
    500: 'Something went wrong on our side. Please try again shortly.'
  };

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
    this.logInternalError(message, statusCode, error);

    const safeMessage = this.getSafeMessage(message, statusCode, error);
    const safeDetails = this.formatError(error, statusCode);
    const errorResponse: ApiResponse<null> = {
      success: false,
      message: safeMessage,
      error: {
        code: this.getErrorCode(statusCode),
        ...(safeDetails ? { details: safeDetails } : {})
      }
    };

    return res.status(statusCode).json(errorResponse);
  }

  private static formatError(error: any, statusCode: number): any {
    if (error instanceof ZodError) {
      return error.errors.map(err => ({
        field: this.humanizeField(err.path.join('.')),
        message: err.message,
        code: 'VALIDATION_ERROR'
      }));
    }

    if (statusCode >= 500 || this.isTechnicalError(error)) {
      return undefined;
    }

    if (error instanceof AppError) {
      return { message: this.sanitizeText(error.message, statusCode) };
    }

    if (typeof error === 'string') {
      return { message: this.sanitizeText(error, statusCode) };
    }

    return undefined;
  }

  static getSafeMessage(message?: string, statusCode: number = 500, error?: any): string {
    if (statusCode >= 500 || this.isTechnicalError(error) || this.isTechnicalText(message)) {
      return this.defaultMessages[statusCode] || this.defaultMessages[500];
    }

    if (error instanceof AppError && error.message && !this.isTechnicalText(error.message)) {
      return error.message;
    }

    if (message && !this.isTechnicalText(message)) {
      return message;
    }

    return this.defaultMessages[statusCode] || this.defaultMessages[500];
  }

  private static sanitizeText(message: string, statusCode: number): string {
    if (!message || this.isTechnicalText(message)) {
      return this.defaultMessages[statusCode] || this.defaultMessages[500];
    }

    return message;
  }

  private static isTechnicalError(error: any): boolean {
    if (!error) return false;

    const name = String(error?.name || '');
    const code = String(error?.code || '');
    const message = error instanceof Error ? error.message : String(error || '');

    return (
      name.includes('Prisma') ||
      code.startsWith('P') ||
      this.isTechnicalText(message)
    );
  }

  private static isTechnicalText(message?: string): boolean {
    if (!message) return false;

    return [
      /prisma/i,
      /findUnique|findFirst|findMany|create\(|update\(|delete\(|upsert\(/i,
      /invocation/i,
      /column .* does not exist/i,
      /unknown arg|unknown argument/i,
      /database|datasource|query engine|sql|mysql|postgres/i,
      /\b[A-Za-z0-9_]+\.[A-Za-z0-9_]+\.[A-Za-z0-9_]+\b/,
      /node_modules|src\\|src\/|\.ts:\d+|\.js:\d+/i,
      /stack trace|TypeError|ReferenceError|SyntaxError/i,
      /request failed with status code \d+/i,
      /\bstatus code \d+/i,
      /foreign key|constraint failed|unique constraint/i,
      /C:\\|\/Users\//i
    ].some((pattern) => pattern.test(message));
  }

  private static humanizeField(field: string): string {
    if (!field) return 'Field';

    return field
      .split('.')
      .pop()!
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/\bid\b/gi, 'identifier')
      .replace(/\b\w/g, char => char.toUpperCase());
  }

  private static logInternalError(message: string, statusCode: number, error?: any): void {
    if (!error || statusCode < 500) return;

    console.error('[API Error]', {
      statusCode,
      responseMessage: message,
      errorName: error?.name,
      errorCode: error?.code,
      errorMessage: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    });
  }

  private static getErrorCode(statusCode: number): string {
    const errorCodes: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'VALIDATION_ERROR',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR'
    };

    return errorCodes[statusCode] || 'UNKNOWN_ERROR';
  }
}

export function authenticatedHandler(
  handler: (req: AuthenticatedRequest, res: Response) => Promise<Response | void | undefined>
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    handler(req as AuthenticatedRequest, res).catch(next);
  };
}
