import { Router } from 'express';
import { Container } from 'inversify';
import { NutrientTypeController } from '../controllers/nutrienttype.controller';
import { AuthGuard } from '../middlewares/auth.guard';
import { authenticatedHandler } from '../utilities/response.utility';

export const createNutrientTypeRoutes = (container: Container): Router => {
  const router = Router();
  const nutrientTypeController = container.get(NutrientTypeController);
  const authGuard = container.get(AuthGuard);

  router.get('/', authenticatedHandler(nutrientTypeController.getNutrientTypes.bind(nutrientTypeController)));
  router.get('/code/:code', authenticatedHandler(nutrientTypeController.getNutrientTypeByCode.bind(nutrientTypeController)));
  router.get('/:id', authenticatedHandler(nutrientTypeController.getNutrientTypeById.bind(nutrientTypeController)));
  router.post('/', authGuard.verify(), authenticatedHandler(nutrientTypeController.createNutrientType.bind(nutrientTypeController)));
  router.put('/:id', authGuard.verify(), authenticatedHandler(nutrientTypeController.updateNutrientType.bind(nutrientTypeController)));
  router.delete('/:id', authGuard.verify(), authenticatedHandler(nutrientTypeController.deleteNutrientType.bind(nutrientTypeController)));

  return router;
};
