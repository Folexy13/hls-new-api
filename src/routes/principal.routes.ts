import { Router } from 'express';
import { Container } from 'inversify';
import { AuthGuard } from '../middlewares/auth.guard';
import { PrincipalController } from '../controllers/principal.controller';

export const createPrincipalRoutes = (container: Container): Router => {
  const router = Router();
  const authGuard = container.get(AuthGuard);
  const principalController = container.get(PrincipalController);

  router.post('/', principalController.createPrincipal.bind(principalController));
  router.get('/me', authGuard.verify(), principalController.getMe.bind(principalController));
  router.put('/me', authGuard.verify(), principalController.updateMe.bind(principalController));
  router.get('/me/income-summary', authGuard.verify(), principalController.getIncomeSummary.bind(principalController));
  router.post('/benfeks', authGuard.verify(), principalController.createBenfek.bind(principalController));
  router.get('/', authGuard.verify(), principalController.getPrincipals.bind(principalController));
  router.get('/:id', authGuard.verify(), principalController.getPrincipalById.bind(principalController));
  router.put('/:id', authGuard.verify(), principalController.updatePrincipal.bind(principalController));
  router.delete('/:id', authGuard.verify(), principalController.deletePrincipal.bind(principalController));

  return router;
};
