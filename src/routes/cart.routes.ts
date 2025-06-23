import { Router } from 'express';
import { Container } from 'inversify';
import { CartController } from '../controllers/cart.controller';
import { AuthGuard } from '../middlewares/auth.guard';
import { authenticatedHandler } from '../utilities/response.utility';

export const createCartRoutes = (container: Container): Router => {
  const router = Router();
  const cartController = container.get(CartController);
  const authGuard = container.get(AuthGuard);

  router.get('/', 
    authGuard.verify(), 
    authenticatedHandler(cartController.getCart.bind(cartController))
  );

  router.post('/items', 
    authGuard.verify(), 
    authenticatedHandler(cartController.addToCart.bind(cartController))
  );

  router.put('/items/:id', 
    authGuard.verify(), 
    authenticatedHandler(cartController.updateCartItem.bind(cartController))
  );

  router.delete('/items/:id', 
    authGuard.verify(), 
    authenticatedHandler(cartController.removeCartItem.bind(cartController))
  );

  router.delete('/', 
    authGuard.verify(), 
    authenticatedHandler(cartController.clearCart.bind(cartController))
  );

  return router;
};