import { Response } from 'express';
import { inject, injectable } from 'inversify';
import { BaseController } from './base.controller';
import { Container } from 'inversify';
import { ResponseUtil } from '../utilities/response.utility';
import { AuthenticatedRequest } from '../types/auth.types';
import { PrincipalService } from '../services/principal.service';
import { CreateBenfekUserSchema, CreatePrincipalUserSchema, UpdatePrincipalUserSchema } from '../DTOs/principal.dto';
import { PaginationUtil } from '../utilities/pagination.utility';

@injectable()
export class PrincipalController extends BaseController {
  constructor(
    container: Container,
    @inject(PrincipalService) private principalService: PrincipalService
  ) {
    super(container);
  }

  private ensurePrincipalRole(req: AuthenticatedRequest, res: Response): boolean {
    if (req.user.role !== 'principal') {
      ResponseUtil.error(res, 'Only principals can manage principal accounts', 403);
      return false;
    }
    return true;
  }

  async createPrincipal(req: AuthenticatedRequest, res: Response) {
    try {
      const data = CreatePrincipalUserSchema.parse(req.body);
      const principal = await this.principalService.createPrincipal(data);
      return ResponseUtil.success(res, principal, 'Principal created successfully', 201);
    } catch (error) {
      const message = (error as Error).message || 'Failed to create principal';
      const status = message.toLowerCase().includes('exists') ? 409 : 500;
      return ResponseUtil.error(res, message, status);
    }
  }

  async createBenfek(req: AuthenticatedRequest, res: Response) {
    try {
      if (!this.ensurePrincipalRole(req, res)) return;
      const data = CreateBenfekUserSchema.parse(req.body);
      const benfek = await this.principalService.createBenfek(data);
      return ResponseUtil.success(res, benfek, 'Benfek created successfully', 201);
    } catch (error) {
      const message = (error as Error).message || 'Failed to create benfek';
      const status = message.toLowerCase().includes('exists') ? 409 : 500;
      return ResponseUtil.error(res, message, status);
    }
  }

  async getPrincipals(req: AuthenticatedRequest, res: Response) {
    try {
      if (!this.ensurePrincipalRole(req, res)) return;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const { principals, total } = await this.principalService.getPrincipals(page, limit);
      return ResponseUtil.success(
        res,
        { principals },
        'Principals retrieved successfully',
        200,
        { pagination: PaginationUtil.getPaginationMetadata(total, page, limit) }
      );
    } catch (error) {
      return ResponseUtil.error(res, (error as Error).message);
    }
  }

  async getMe(req: AuthenticatedRequest, res: Response) {
    try {
      if (!this.ensurePrincipalRole(req, res)) return;
      const principal = await this.principalService.getPrincipalById(req.user.id);
      if (!principal) {
        return ResponseUtil.error(res, 'Principal not found', 404);
      }
      return ResponseUtil.success(res, principal, 'Principal profile retrieved');
    } catch (error) {
      return ResponseUtil.error(res, (error as Error).message || 'Failed to retrieve principal profile');
    }
  }

  async updateMe(req: AuthenticatedRequest, res: Response) {
    try {
      if (!this.ensurePrincipalRole(req, res)) return;
      const data = UpdatePrincipalUserSchema.parse(req.body);
      const principal = await this.principalService.updatePrincipal(req.user.id, data);
      return ResponseUtil.success(res, principal, 'Principal profile updated');
    } catch (error) {
      const message = (error as Error).message || 'Failed to update principal profile';
      const status = message.toLowerCase().includes('not found') ? 404 : 500;
      return ResponseUtil.error(res, message, status);
    }
  }

  async getIncomeSummary(req: AuthenticatedRequest, res: Response) {
    try {
      if (!this.ensurePrincipalRole(req, res)) return;
      const summary = await this.principalService.getIncomeSummary(req.user.id);
      return ResponseUtil.success(res, summary, 'Income summary retrieved');
    } catch (error) {
      return ResponseUtil.error(res, (error as Error).message || 'Failed to retrieve income summary');
    }
  }

  async getPrincipalById(req: AuthenticatedRequest, res: Response) {
    try {
      if (!this.ensurePrincipalRole(req, res)) return;
      const id = parseInt(req.params.id);
      const principal = await this.principalService.getPrincipalById(id);
      if (!principal) {
        return ResponseUtil.error(res, 'Principal not found', 404);
      }
      return ResponseUtil.success(res, principal, 'Principal retrieved successfully');
    } catch (error) {
      return ResponseUtil.error(res, (error as Error).message || 'Failed to retrieve principal');
    }
  }

  async updatePrincipal(req: AuthenticatedRequest, res: Response) {
    try {
      if (!this.ensurePrincipalRole(req, res)) return;
      const id = parseInt(req.params.id);
      const data = UpdatePrincipalUserSchema.parse(req.body);
      const principal = await this.principalService.updatePrincipal(id, data);
      return ResponseUtil.success(res, principal, 'Principal updated successfully');
    } catch (error) {
      const message = (error as Error).message || 'Failed to update principal';
      const status = message.toLowerCase().includes('not found') ? 404 : 500;
      return ResponseUtil.error(res, message, status);
    }
  }

  async deletePrincipal(req: AuthenticatedRequest, res: Response) {
    try {
      if (!this.ensurePrincipalRole(req, res)) return;
      const id = parseInt(req.params.id);
      const principal = await this.principalService.deletePrincipal(id);
      return ResponseUtil.success(res, principal, 'Principal deleted successfully');
    } catch (error) {
      const message = (error as Error).message || 'Failed to delete principal';
      const status = message.toLowerCase().includes('not found') ? 404 : 500;
      return ResponseUtil.error(res, message, status);
    }
  }
}
