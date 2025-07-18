import { Request, Response, NextFunction } from "express";
import { injectable } from "inversify";
import { verify } from "jsonwebtoken";
import { ResponseUtil } from "../utilities/response.utility";
import type { AuthenticatedRequest, Role } from "../types/auth.types";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

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
        const decoded = verify(token, JWT_SECRET) as {
          userId: number;
          role: string;
          email: string;
        };
        (req as AuthenticatedRequest).user = {
          id: decoded.userId,
          role: decoded.role as Role,
          email: decoded.email,
        };

        next();
      } catch (error) {
        ResponseUtil.error(res, "Invalid token", 401);
        return;
      }
    };
  }
}
