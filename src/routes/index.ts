import { Router } from 'express';
import { Container } from 'inversify';
import { PingController } from '../controllers/ping.controller';
import { createAuthRoutes } from './auth.routes';
import { createWalletRoutes } from './wallet.routes';
import { createCartRoutes } from './cart.routes';
import { createSupplementRoutes } from './supplement.routes';
import { createPodcastRoutes } from './podcast.routes';

export const createRoutes = (container: Container): Router => {
  const router = Router();
  const pingController = container.get(PingController);

  /**
   * @swagger
   * tags:
   *   name: Health
   *   description: Server health check endpoints
   */
  router.get('/ping', pingController.ping.bind(pingController));
  // Mount auth routes
  router.use('/auth', createAuthRoutes(container));
  // Mount wallet routes
  router.use('/wallet', createWalletRoutes(container));
  // Mount cart routes
  router.use('/cart', createCartRoutes(container));
  // Mount supplement routes
  router.use('/supplements', createSupplementRoutes(container));
  // Mount podcast routes
  router.use('/podcasts', createPodcastRoutes(container));

  return router;
};
