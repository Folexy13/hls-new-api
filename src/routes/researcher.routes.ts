import { Router } from 'express';
import { Container } from 'inversify';
import { ResearcherController } from '../controllers/researcher.controller';
import { AuthGuard } from '../middlewares/auth.guard';
import { authenticatedHandler } from '../utilities/response.utility';

export const createResearcherRoutes = (container: Container): Router => {
  const router = Router();
  const researcherController = container.get(ResearcherController);
  const authGuard = container.get(AuthGuard);

  router.use(authGuard.verify());

  router.post('/verify-benfek-code', authenticatedHandler(researcherController.verifyBenfekCode));
  router.get('/supplements', authenticatedHandler(researcherController.getSupplements));
  router.post('/supplements', authenticatedHandler(researcherController.createSupplement));
  router.put('/supplements/:id', authenticatedHandler(researcherController.updateSupplement));
  router.delete('/supplements/:id', authenticatedHandler(researcherController.deleteSupplement));
  router.post('/packs/dispatch', authenticatedHandler(researcherController.dispatchPack));
  router.get('/packs/:code', authenticatedHandler(researcherController.getBenfekPacks));
  router.delete('/packs/:id', authenticatedHandler(researcherController.deletePack));

  router.get('/notifications', authenticatedHandler(researcherController.getNotifications));
  router.patch('/notifications/:id/read', authenticatedHandler(researcherController.markNotificationRead));

  router.post('/operational-payments', authenticatedHandler(researcherController.createOperationalPayment));
  router.get('/operational-payments', authenticatedHandler(researcherController.getOperationalPayments));

  router.get('/checker/orders/:id', authenticatedHandler(researcherController.getOrderById));
  router.get('/checker/principals/:principalId/payments', authenticatedHandler(researcherController.getPrincipalPayments));
  router.get('/checker/principals/:principalId/account', authenticatedHandler(researcherController.getPrincipalAccount));

  return router;
};
