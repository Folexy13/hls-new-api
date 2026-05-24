import { Request, Response, NextFunction } from "express";
import { injectable } from "inversify";
import { verify } from "jsonwebtoken";
import { ResponseUtil } from "../utilities/response.utility";
import type { AuthenticatedRequest, Role } from "../types/auth.types";
import { config } from "../config/config";

@injectable()
export class AuthGuard {
  verify() {
    return async (
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
          ResponseUtil.error(res, "No token provided", 401);
          return;
        }

        const [, token] = authHeader.split(" ");
        if (!token) {
          ResponseUtil.error(res, "Invalid token format", 401);
          return;
        }
        const decoded = verify(token, config.jwtSecret) as {
          userId: number;
          role: string;
          email: string;
          researcherType?: string | null;
        };
        console.log('Token verified successfully for user:', decoded.userId);
        (req as AuthenticatedRequest).user = {
          id: decoded.userId,
          role: decoded.role as Role,
          email: decoded.email,
          researcherType: (decoded.researcherType as any) ?? null,
        };

        next();
      } catch (error) {
        console.error('JWT Verification failed:', (error as Error).message);
        console.error('Used Secret (first 4 chars):', config.jwtSecret.substring(0, 4));
        ResponseUtil.error(res, "Invalid token", 401);
        return;
      }
    };
  }
}
