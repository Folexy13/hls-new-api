import { injectable } from 'inversify';
import { Response } from 'express';
import { BaseController } from './base.controller';
import { PodcastService } from '../services/podcast.service';
import { ResponseUtil } from '../utilities/response.utility';
import { Container } from 'inversify';
import { AuthenticatedRequest } from '../types/auth.types';
import { CreatePodcastSchema, UpdatePodcastSchema } from '../DTOs/podcast.dto';
import { PaginationUtil } from '../utilities/pagination.utility';
import multer from 'multer';
import { AppError } from '../utilities/errors';

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    // Accept only audio files
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
}).single('audio');

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     BearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     Podcast:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         audioUrl:
 *           type: string
 *         userId:
 *           type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       required:
 *         - id
 *         - title
 *         - description
 *         - audioUrl
 *         - userId
 *         - createdAt
 *         - updatedAt
 *     CreatePodcastRequest:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           minLength: 3
 *         description:
 *           type: string
 *           minLength: 10
 *         audio:
 *           type: string
 *           format: binary
 *       required:
 *         - title
 *         - description
 *         - audio
 *     UpdatePodcastRequest:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           minLength: 3
 *         description:
 *           type: string
 *           minLength: 10
 *     PaginationMeta:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *         page:
 *           type: integer
 *         limit:
 *           type: integer
 *         totalPages:
 *           type: integer
 */

@injectable()
export class PodcastController extends BaseController {
  private podcastService: PodcastService;

  constructor(container: Container) {
    super(container);
    this.podcastService = container.get(PodcastService);
  }

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
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 podcasts:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Podcast'
   *                 meta:
   *                   $ref: '#/components/schemas/PaginationMeta'
   */
  async getPodcasts(req: AuthenticatedRequest, res: Response) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const { podcasts, total } = await this.podcastService.findAll(pageNum, limitNum);
      
      return ResponseUtil.success(res, { 
        podcasts,
        meta: PaginationUtil.getPaginationMetadata(total, pageNum, limitNum)
      });
    } catch (error) {
      return ResponseUtil.error(res, error as string);
    }
  }

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
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 podcast:
   *                   $ref: '#/components/schemas/Podcast'
   *       404:
   *         description: Podcast not found
   */
  async getPodcastById(req: AuthenticatedRequest, res: Response) {
    try {
      const podcastId = parseInt(req.params.id);
      const podcast = await this.podcastService.findById(podcastId);
      
      if (!podcast) {
        return ResponseUtil.error(res, 'Podcast not found', 404);
      }

      return ResponseUtil.success(res, { podcast });
    } catch (error) {
      return ResponseUtil.error(res, error as string);
    }
  }

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
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 podcasts:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Podcast'
   */
  async getUserPodcasts(req: AuthenticatedRequest, res: Response) {
    try {
      const podcasts = await this.podcastService.findByUserId(req.user.id);
      return ResponseUtil.success(res, { podcasts });
    } catch (error) {
      return ResponseUtil.error(res, error as string);
    }
  }

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
   *             $ref: '#/components/schemas/CreatePodcastRequest'
   *     responses:
   *       201:
   *         description: Podcast created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 podcast:
   *                   $ref: '#/components/schemas/Podcast'
   *       400:
   *         description: Invalid input data or audio file
   */
  async createPodcast(req: AuthenticatedRequest, res: Response) {
    try {
      // Handle file upload
      await new Promise<void>((resolve, reject) => {
        upload(req, res, (err) => {
          if (err instanceof multer.MulterError) {
            reject(new AppError(`File upload error: ${err.message}`, 400));
          } else if (err) {
            reject(new AppError(err.message, 400));
          }
          resolve();
        });
      });

      if (!req.file) {
        throw new AppError('Audio file is required', 400);
      }

      const data = CreatePodcastSchema.parse(req.body);
      const podcast = await this.podcastService.create(req.user.id, data, req.file);
      return ResponseUtil.success(res, { podcast }, 'Podcast created successfully', 201);
    } catch (error) {
      return ResponseUtil.error(res, error as string);
    }
  }

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
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 podcast:
   *                   $ref: '#/components/schemas/Podcast'
   *       400:
   *         description: Invalid input data
   *       404:
   *         description: Podcast not found
   */
  async updatePodcast(req: AuthenticatedRequest, res: Response) {
    try {
      const podcastId = parseInt(req.params.id);
      const data = UpdatePodcastSchema.parse(req.body);
      const podcast = await this.podcastService.update(podcastId, req.user.id, data);
      return ResponseUtil.success(res, { podcast });
    } catch (error) {
      return ResponseUtil.error(res, error as string);
    }
  }

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
   *       404:
   *         description: Podcast not found
   */
  async deletePodcast(req: AuthenticatedRequest, res: Response) {
    try {
      const podcastId = parseInt(req.params.id);
      await this.podcastService.delete(podcastId, req.user.id);
      return ResponseUtil.success(res, null, 'Podcast deleted successfully');
    } catch (error) {
      return ResponseUtil.error(res, error as string);
    }
  }

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
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 streamUrl:
   *                   type: string
   *       404:
   *         description: Podcast not found
   */
  async getStreamUrl(req: AuthenticatedRequest, res: Response) {
    try {
      const podcastId = parseInt(req.params.id);
      const streamUrl = await this.podcastService.getStreamUrl(podcastId);
      return ResponseUtil.success(res, { streamUrl });
    } catch (error) {
      return ResponseUtil.error(res, error as string);
    }
  }

  /**
   * @swagger
   * /api/v2/podcasts/search:
   *   get:
   *     tags: [Podcasts]
   *     summary: Search podcasts
   *     parameters:
   *       - name: q
   *         in: query
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Search results retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 podcasts:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Podcast'
   *       400:
   *         description: Search query is required
   */
  async searchPodcasts(req: AuthenticatedRequest, res: Response) {
    try {
      const query = req.query.q as string;
      if (!query) {
        return ResponseUtil.error(res, 'Search query is required', 400);
      }

      const podcasts = await this.podcastService.search(query);
      return ResponseUtil.success(res, { podcasts });
    } catch (error) {
      return ResponseUtil.error(res, error as string);
    }
  }
}