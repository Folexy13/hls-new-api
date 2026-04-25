import { Router } from 'express';
import { Container } from 'inversify';
import { BenfekController } from '../controllers/benfek.controller';
import { AuthGuard } from '../middlewares/auth.guard';
import { authenticatedHandler } from '../utilities/response.utility';

export const createBenfekRoutes = (container: Container): Router => {
  const router = Router();
  const benfekController = container.get(BenfekController);
  const authGuard = container.get(AuthGuard);

  router.get('/packs', authGuard.verify(), authenticatedHandler(benfekController.getMyPacks));
  router.post('/game-points', authGuard.verify(), authenticatedHandler(benfekController.saveGamePoints));
  router.get('/game-points/me', authGuard.verify(), authenticatedHandler(benfekController.getMyGamePoints));
  router.post('/invoice', authGuard.verify(), authenticatedHandler(benfekController.sendInvoiceImage));

  return router;
};
