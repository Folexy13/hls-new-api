import { Router } from 'express';
import { Container } from 'inversify';
import { PodcastController } from '../controllers/podcast.controller';
import { AuthGuard } from '../middlewares/auth.guard';
import { authenticatedHandler } from '../utilities/response.utility';

export const createPodcastRoutes = (container: Container): Router => {
  const router = Router();
  const podcastController = container.get(PodcastController);
  const authGuard = container.get(AuthGuard);

  /**
   * @swagger
   * /api/v2/podcasts:
   *   get:
   *     tags: [Podcasts]
   *     summary: Get all podcasts with pagination
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
   *         description: List of podcasts retrieved successfully
   */
  router.get('/', 
    authenticatedHandler(podcastController.getPodcasts.bind(podcastController))
  );

  /**
   * @swagger
   * /api/v2/podcasts/search:
   *   get:
   *     tags: [Podcasts]
   *     summary: Search podcasts
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
    authenticatedHandler(podcastController.searchPodcasts.bind(podcastController))
  );

  /**
   * @swagger
   * /api/v2/podcasts/user:
   *   get:
   *     tags: [Podcasts]
   *     summary: Get podcasts by authenticated user
   *     security:
   *       - BearerAuth: []
   *     responses:
   *       200:
   *         description: List of user's podcasts retrieved successfully
   */
  router.get('/user', 
    authGuard.verify(), 
    authenticatedHandler(podcastController.getUserPodcasts.bind(podcastController))
  );

  /**
   * @swagger
   * /api/v2/podcasts/{id}:
   *   get:
   *     tags: [Podcasts]
   *     summary: Get podcast by ID
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Podcast details retrieved successfully
   */
  router.get('/:id', 
    authenticatedHandler(podcastController.getPodcastById.bind(podcastController))
  );

  /**
   * @swagger
   * /api/v2/podcasts/{id}/stream:
   *   get:
   *     tags: [Podcasts]
   *     summary: Get streaming URL for a podcast
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Streaming URL retrieved successfully
   */
  router.get('/:id/stream', 
    authenticatedHandler(podcastController.getStreamUrl.bind(podcastController))
  );

  /**
   * @swagger
   * /api/v2/podcasts:
   *   post:
   *     tags: [Podcasts]
   *     summary: Create a new podcast
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               title:
   *                 type: string
   *                 minimum: 3
   *               description:
   *                 type: string
   *                 minimum: 10
   *               audio:
   *                 type: string
   *                 format: binary
   *     responses:
   *       201:
   *         description: Podcast created successfully
   */
  router.post('/', 
    authGuard.verify(), 
    authenticatedHandler(podcastController.createPodcast.bind(podcastController))
  );

  /**
   * @swagger
   * /api/v2/podcasts/{id}:
   *   put:
   *     tags: [Podcasts]
   *     summary: Update podcast by ID
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
   *             $ref: '#/components/schemas/UpdatePodcastRequest'
   *     responses:
   *       200:
   *         description: Podcast updated successfully
   */
  router.put('/:id', 
    authGuard.verify(), 
    authenticatedHandler(podcastController.updatePodcast.bind(podcastController))
  );

  /**
   * @swagger
   * /api/v2/podcasts/{id}:
   *   delete:
   *     tags: [Podcasts]
   *     summary: Delete podcast by ID
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
   *         description: Podcast deleted successfully
   */
  router.delete('/:id', 
    authGuard.verify(), 
    authenticatedHandler(podcastController.deletePodcast.bind(podcastController))
  );

  return router;
};
