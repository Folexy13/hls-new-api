import { PaystackController } from '../controllers/paystack.controller';
import { Router } from 'express';
import { Container } from 'inversify';
import { AuthGuard } from '../middlewares/auth.guard';
import { authenticatedHandler } from '../utilities/response.utility';

export const createPaystackRoutes = (container: Container) => {
  const router = Router();
  const paystackController = container.get(PaystackController);
  const authGuard = container.get(AuthGuard);

  // Mount webhook route before authentication
  router.post(
    '/webhook',
    paystackController.handleWebhook
  );

  router.post(
    '/initialize',
    authGuard.verify(),
    authenticatedHandler(paystackController.initializeCheckout)
  );
  router.get(
    '/verify/:reference',
    authGuard.verify(),
    authenticatedHandler(paystackController.verifyCheckout)
  );
  router.post(
    '/checkout',
    authGuard.verify(),
    authenticatedHandler(paystackController.checkoutFromCart)
  );
  router.post(
    '/checkout/pack',
    authGuard.verify(),
    authenticatedHandler(paystackController.checkoutPack)
  );
  router.post(
    '/webhook',
    paystackController.handleWebhook
  );

  return router;
};
