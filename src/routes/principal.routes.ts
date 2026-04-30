import { Router } from 'express';
import { Container } from 'inversify';
import { AuthGuard } from '../middlewares/auth.guard';
import { PrincipalController } from '../controllers/principal.controller';
import { authenticatedHandler } from '../utilities/response.utility';

export const createPrincipalRoutes = (container: Container): Router => {
  const router = Router();
  const authGuard = container.get(AuthGuard);
  const principalController = container.get(PrincipalController);

  router.post('/', authenticatedHandler(principalController.createPrincipal.bind(principalController)));
  router.get('/me', authGuard.verify(), authenticatedHandler(principalController.getMe.bind(principalController)));
  router.put('/me', authGuard.verify(), authenticatedHandler(principalController.updateMe.bind(principalController)));
  router.get('/me/income-summary', authGuard.verify(), authenticatedHandler(principalController.getIncomeSummary.bind(principalController)));
  router.post('/me/credits/:id/resolve', authGuard.verify(), authenticatedHandler(principalController.resolveCredit.bind(principalController)));
  router.post('/benfeks', authGuard.verify(), authenticatedHandler(principalController.createBenfek.bind(principalController)));
  router.get('/me/benfeks', authGuard.verify(), authenticatedHandler(principalController.getMyBenfeks.bind(principalController)));
  router.get('/', authGuard.verify(), authenticatedHandler(principalController.getPrincipals.bind(principalController)));
  router.get('/:id', authGuard.verify(), authenticatedHandler(principalController.getPrincipalById.bind(principalController)));
  router.put('/:id', authGuard.verify(), authenticatedHandler(principalController.updatePrincipal.bind(principalController)));
  router.delete('/:id', authGuard.verify(), authenticatedHandler(principalController.deletePrincipal.bind(principalController)));

  return router;
};
