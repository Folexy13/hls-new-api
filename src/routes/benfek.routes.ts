import { Router } from 'express';
import { Container } from 'inversify';
import { BenfekController } from '../controllers/benfek.controller';
import { AuthGuard } from '../middlewares/auth.guard';
import { authenticatedHandler } from '../utilities/response.utility';

export const createBenfekRoutes = (container: Container): Router => {
  const router = Router();
  const benfekController = container.get(BenfekController);
  const authGuard = container.get(AuthGuard);

  router.get('/profile', authGuard.verify(), authenticatedHandler(benfekController.getMyProfile));
  router.put('/profile', authGuard.verify(), authenticatedHandler(benfekController.updateMyProfile));
  router.put('/password', authGuard.verify(), authenticatedHandler(benfekController.changePassword));
  router.get('/packs', authGuard.verify(), authenticatedHandler(benfekController.getMyPacks));
  router.get('/orders', authGuard.verify(), authenticatedHandler(benfekController.getMyOrders));
  router.get('/support', authGuard.verify(), authenticatedHandler(benfekController.getMySupportTickets));
  router.post('/support', authGuard.verify(), authenticatedHandler(benfekController.createSupportTicket));
  router.post('/game-points', authGuard.verify(), authenticatedHandler(benfekController.saveGamePoints));
  router.get('/game-points/me', authGuard.verify(), authenticatedHandler(benfekController.getMyGamePoints));

  return router;
};
