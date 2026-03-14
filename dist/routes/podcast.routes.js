"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPodcastRoutes = void 0;
const express_1 = require("express");
const podcast_controller_1 = require("../controllers/podcast.controller");
const auth_guard_1 = require("../middlewares/auth.guard");
const response_utility_1 = require("../utilities/response.utility");
const createPodcastRoutes = (container) => {
    const router = (0, express_1.Router)();
    const podcastController = container.get(podcast_controller_1.PodcastController);
    const authGuard = container.get(auth_guard_1.AuthGuard);
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
    router.get('/', (0, response_utility_1.authenticatedHandler)(podcastController.getPodcasts.bind(podcastController)));
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
    router.get('/search', (0, response_utility_1.authenticatedHandler)(podcastController.searchPodcasts.bind(podcastController)));
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
    router.get('/user', authGuard.verify(), (0, response_utility_1.authenticatedHandler)(podcastController.getUserPodcasts.bind(podcastController)));
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
    router.get('/:id', (0, response_utility_1.authenticatedHandler)(podcastController.getPodcastById.bind(podcastController)));
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
    router.get('/:id/stream', (0, response_utility_1.authenticatedHandler)(podcastController.getStreamUrl.bind(podcastController)));
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
    router.post('/', authGuard.verify(), (0, response_utility_1.authenticatedHandler)(podcastController.createPodcast.bind(podcastController)));
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
    router.put('/:id', authGuard.verify(), (0, response_utility_1.authenticatedHandler)(podcastController.updatePodcast.bind(podcastController)));
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
    router.delete('/:id', authGuard.verify(), (0, response_utility_1.authenticatedHandler)(podcastController.deletePodcast.bind(podcastController)));
    return router;
};
exports.createPodcastRoutes = createPodcastRoutes;
//# sourceMappingURL=podcast.routes.js.map