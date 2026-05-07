import { Response } from 'express';
import { inject, injectable } from 'inversify';
import { BaseController } from './base.controller';
import { Container } from 'inversify';
import { ResponseUtil } from '../utilities/response.utility';
import { AuthenticatedRequest } from '../types/auth.types';
import { PrincipalService } from '../services/principal.service';
import { NotificationService } from '../services/notification.service';
import { CreateBenfekRecordSchema, CreatePrincipalUserSchema, UpdatePrincipalUserSchema } from '../DTOs/principal.dto';
import { PaginationUtil } from '../utilities/pagination.utility';
import { formatHealthField } from '../utilities/health-field.utility';

@injectable()
export class PrincipalController extends BaseController {
  constructor(
    container: Container,
    @inject(PrincipalService) private principalService: PrincipalService,
    @inject(NotificationService) private notificationService: NotificationService
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
      
      const data = CreateBenfekRecordSchema.parse(req.body);
      // Change: Create a QuizCode instead of a direct User
      // This allows the Benfek to use the code to register themselves later
      const benfek = await this.principalService.createBenfekRecord(req.user.id, data);

      await this.notificationService.sendBenfekCodeMessage({
        phone: data.benfekPhone,
        code: benfek.code,
        benfekName: data.benfekName,
      }).catch(() => undefined);
      
      return ResponseUtil.success(res, benfek, 'Benfek created and Quiz Code generated successfully', 201);
    } catch (error) {
      const message = (error as Error).message || 'Failed to create benfek';
      const status = (error as any).statusCode || 500;
      return ResponseUtil.error(res, message, status);
    }
  }

  async getMyBenfeks(req: AuthenticatedRequest, res: Response) {
    try {
      if (!this.ensurePrincipalRole(req, res)) return;
      
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const name = req.query.name as string;
      
      const { benfeks, total } = await this.principalService.getBenfeksByPrincipal(req.user.id, page, limit, name);
      const formattedBenfeks = benfeks.map((benfek: any) => ({
        ...benfek,
        allergies: formatHealthField(benfek.allergies),
        scares: formatHealthField(benfek.scares),
        familyCondition: formatHealthField(benfek.familyCondition),
        medications: formatHealthField(benfek.medications),
        currentConditions: benfek.currentConditions ?? undefined,
      }));
      
      return ResponseUtil.success(
        res,
        { benfeks: formattedBenfeks },
        'Benfeks retrieved successfully',
        200,
        { pagination: PaginationUtil.getPaginationMetadata(total, page, limit) }
      );
    } catch (error) {
      return ResponseUtil.error(res, (error as Error).message);
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

  async getNotificationSummary(req: AuthenticatedRequest, res: Response) {
    try {
      if (!this.ensurePrincipalRole(req, res)) return;
      const summary = await this.principalService.getNotificationSummary(req.user.id);
      return ResponseUtil.success(res, summary, 'Notification summary retrieved');
    } catch (error) {
      return ResponseUtil.error(res, (error as Error).message || 'Failed to retrieve notification summary');
    }
  }

  async markNotificationRead(req: AuthenticatedRequest, res: Response) {
    try {
      if (!this.ensurePrincipalRole(req, res)) return;
      const notificationId = Number.parseInt(String(req.params.id), 10);
      if (!notificationId) {
        return ResponseUtil.error(res, 'Invalid notification id', 400);
      }

      await this.principalService.markNotificationRead(req.user.id, notificationId);
      return ResponseUtil.success(res, { id: notificationId }, 'Notification marked as read');
    } catch (error) {
      return ResponseUtil.error(res, (error as Error).message || 'Failed to mark notification as read');
    }
  }

  async markAllNotificationsRead(req: AuthenticatedRequest, res: Response) {
    try {
      if (!this.ensurePrincipalRole(req, res)) return;
      await this.principalService.markAllNotificationsRead(req.user.id);
      return ResponseUtil.success(res, {}, 'Notifications marked as read');
    } catch (error) {
      return ResponseUtil.error(res, (error as Error).message || 'Failed to mark notifications as read');
    }
  }

  async deleteNotification(req: AuthenticatedRequest, res: Response) {
    try {
      if (!this.ensurePrincipalRole(req, res)) return;
      const notificationId = Number.parseInt(String(req.params.id), 10);
      if (!notificationId) {
        return ResponseUtil.error(res, 'Invalid notification id', 400);
      }

      await this.principalService.deleteNotification(req.user.id, notificationId);
      return ResponseUtil.success(res, { id: notificationId }, 'Notification deleted');
    } catch (error) {
      return ResponseUtil.error(res, (error as Error).message || 'Failed to delete notification');
    }
  }

  async resolveCredit(req: AuthenticatedRequest, res: Response) {
    try {
      if (!this.ensurePrincipalRole(req, res)) return;
      const creditId = Number.parseInt(String(req.params.id), 10);
      if (!creditId) {
        return ResponseUtil.error(res, 'Invalid credit id', 400);
      }

      const summary = await this.principalService.resolvePrincipalCredit(req.user.id, creditId);
      return ResponseUtil.success(res, { id: creditId, summary }, 'Credit resolved');
    } catch (error) {
      return ResponseUtil.error(res, (error as Error).message || 'Failed to resolve credit');
    }
  }

  async getPrincipalById(req: AuthenticatedRequest, res: Response) {
    try {
      if (!this.ensurePrincipalRole(req, res)) return;
      const id = parseInt(req.params.id as any);
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
      const id = parseInt(req.params.id as any);
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
      const id = parseInt(req.params.id as any);
      const principal = await this.principalService.deletePrincipal(id);
      return ResponseUtil.success(res, principal, 'Principal deleted successfully');
    } catch (error) {
      const message = (error as Error).message || 'Failed to delete principal';
      const status = message.toLowerCase().includes('not found') ? 404 : 500;
      return ResponseUtil.error(res, message, status);
    }
  }
}
