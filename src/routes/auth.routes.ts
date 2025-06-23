import { Router } from 'express';
import { Container } from 'inversify';
import { AuthController } from '../controllers/auth.controller';

export const createAuthRoutes = (container: Container): Router => {
  const router = Router();
  const authController = container.get(AuthController);

  router.post('/register', authController.register.bind(authController));
  router.post('/login', authController.login.bind(authController));
  router.post('/refresh', authController.refreshToken.bind(authController));
  router.post('/logout', authController.logout.bind(authController));

  return router;
};
