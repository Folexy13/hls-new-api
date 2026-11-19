import { Router } from 'express';
import { Container } from 'inversify';
import { AuthGuard } from '../middlewares/auth.guard';
import { OperationsController } from '../controllers/operations.controller';
import { authenticatedHandler } from '../utilities/response.utility';
import { ZodError } from 'zod';
import { ResponseUtil } from '../utilities/response.utility';
import { AuthenticatedRequest } from '../types/auth.types';
import { Response } from 'express';

export const createOperationsRoutes = (container: Container) => {
  const router = Router();
  const controller = container.get(OperationsController);
  const handle = (action: (req: AuthenticatedRequest, res: Response) => Promise<unknown>) => authenticatedHandler(async (req, res) => {
    try { await action(req, res); }
    catch (error) {
      if (error instanceof ZodError) { ResponseUtil.error(res, 'Validation failed', 400); return; }
      throw error;
    }
  });
  router.use(container.get(AuthGuard).verify());
  router.get('/access', handle(controller.access));
  router.get('/:kind', handle(controller.list));
  router.patch('/orders/:id/status', handle(controller.updateOrder));
  router.post('/support/:id/replies', handle(controller.reply));
  router.post('/pharmacies/:id/accept', handle(controller.acceptPharmacy));
  return router;
};
