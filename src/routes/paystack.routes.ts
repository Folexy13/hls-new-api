import { PaystackController } from '../controllers/paystack.controller';
import { Router } from 'express';
import { Container } from 'inversify';

export const createPaystackRoutes = (container: Container) => {
  const router = Router();
  const paystackController = container.get(PaystackController);
  router.post('/initialize', paystackController.initializeCheckout.bind(paystackController));
  router.get('/verify/:reference', paystackController.verifyCheckout.bind(paystackController));
  router.post('/checkout', paystackController.checkoutFromCart.bind(paystackController));
  return router;
};
