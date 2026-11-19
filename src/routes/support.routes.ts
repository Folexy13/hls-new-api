import { Router } from 'express';
import { Container } from 'inversify';
import { BenfekController } from '../controllers/benfek.controller';
import { AuthGuard } from '../middlewares/auth.guard';
import { authenticatedHandler } from '../utilities/response.utility';

export const createSupportRoutes = (container: Container): Router => {
  const router = Router();
  const controller = container.get(BenfekController);
  const guard = container.get(AuthGuard);
  router.get('/', guard.verify(), authenticatedHandler(controller.getSupportTickets));
  router.post('/', guard.verify(), authenticatedHandler(controller.createSupportTicket));
  return router;
};
