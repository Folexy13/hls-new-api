import { Router } from 'express';
import { Container } from 'inversify';
import { SupplementController } from '../controllers/supplement.controller';
import { AuthGuard } from '../middlewares/auth.guard';
import { authenticatedHandler } from '../utilities/response.utility';

export const createSupplementRoutes = (container: Container): Router => {
  const router = Router();
  const supplementController = container.get(SupplementController);
  const authGuard = container.get(AuthGuard);

  /**
   * @swagger
   * /api/v2/supplements:
   *   get:
   *     tags: [Supplements]
   *     summary: Get all supplements with pagination
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 10
   *     responses:
   *       200:
   *         description: List of supplements retrieved successfully
   */
  router.get('/', 
    authenticatedHandler(supplementController.getSupplements.bind(supplementController))
  );

  /**
   * @swagger
   * /api/v2/supplements/search:
   *   get:
   *     tags: [Supplements]
   *     summary: Search supplements
   *     parameters:
   *       - in: query
   *         name: q
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Search results retrieved successfully
   */
  router.get('/search', 
    authenticatedHandler(supplementController.searchSupplements.bind(supplementController))
  );

  /**
   * @swagger
   * /api/v2/supplements/user:
   *   get:
   *     tags: [Supplements]
   *     summary: Get supplements by authenticated user
   *     security:
   *       - BearerAuth: []
   *     responses:
   *       200:
   *         description: List of user's supplements retrieved successfully
   */
  router.get('/user', 
    authGuard.verify(), 
    authenticatedHandler(supplementController.getUserSupplements.bind(supplementController))
  );

  /**
   * @swagger
   * /api/v2/supplements/{id}:
   *   get:
   *     tags: [Supplements]
   *     summary: Get supplement by ID
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Supplement details retrieved successfully
   */
  router.get('/:id', 
    authenticatedHandler(supplementController.getSupplementById.bind(supplementController))
  );

  /**
   * @swagger
   * /api/v2/supplements:
   *   post:
   *     tags: [Supplements]
   *     summary: Create a new supplement
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateSupplementRequest'
   *     responses:
   *       201:
   *         description: Supplement created successfully
   */
  router.post('/', 
    authGuard.verify(), 
    authenticatedHandler(supplementController.createSupplement.bind(supplementController))
  );

  /**
   * @swagger
   * /api/v2/supplements/{id}:
   *   put:
   *     tags: [Supplements]
   *     summary: Update supplement by ID
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdateSupplementRequest'
   *     responses:
   *       200:
   *         description: Supplement updated successfully
   */
  router.put('/:id', 
    authGuard.verify(), 
    authenticatedHandler(supplementController.updateSupplement.bind(supplementController))
  );

  /**
   * @swagger
   * /api/v2/supplements/{id}:
   *   delete:
   *     tags: [Supplements]
   *     summary: Delete supplement by ID
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Supplement deleted successfully
   */
  router.delete('/:id', 
    authGuard.verify(), 
    authenticatedHandler(supplementController.deleteSupplement.bind(supplementController))
  );

  return router;
};
