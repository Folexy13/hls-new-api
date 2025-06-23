import { Request } from 'express';

export type Role = 'benfek' | 'principal' | 'pharmacy' | 'researcher';

export interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    role: Role;
  };
}
