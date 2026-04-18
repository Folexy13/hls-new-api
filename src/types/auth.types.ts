import { Request } from 'express';

export type Role = 'benfek' | 'principal' | 'pharmacy' | 'researcher' | 'wholesaler';
export type ResearcherType = 'maker' | 'checker';

export interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    role: Role;
    email: string;
    researcherType?: ResearcherType | null;
  };
}
