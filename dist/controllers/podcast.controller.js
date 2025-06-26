"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PodcastController = void 0;
const inversify_1 = require("inversify");
const base_controller_1 = require("./base.controller");
const podcast_service_1 = require("../services/podcast.service");
const response_utility_1 = require("../utilities/response.utility");
const inversify_2 = require("inversify");
const podcast_dto_1 = require("../DTOs/podcast.dto");
const pagination_utility_1 = require("../utilities/pagination.utility");
const multer_1 = __importDefault(require("multer"));
const errors_1 = require("../utilities/errors");
// Configure multer for memory storage
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    fileFilter: (_req, file, cb) => {
        // Accept only audio files
        if (file.mimetype.startsWith('audio/')) {
            cb(null, true);
        }
        else {
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
let PodcastController = class PodcastController extends base_controller_1.BaseController {
    constructor(container) {
        super(container);
        this.podcastService = container.get(podcast_service_1.PodcastService);
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
    getPodcasts(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { page = 1, limit = 10 } = req.query;
                const pageNum = parseInt(page);
                const limitNum = parseInt(limit);
                const { podcasts, total } = yield this.podcastService.findAll(pageNum, limitNum);
                return response_utility_1.ResponseUtil.success(res, {
                    podcasts,
                    meta: pagination_utility_1.PaginationUtil.getPaginationMetadata(total, pageNum, limitNum)
                });
            }
            catch (error) {
                return response_utility_1.ResponseUtil.error(res, error);
            }
        });
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
    getPodcastById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const podcastId = parseInt(req.params.id);
                const podcast = yield this.podcastService.findById(podcastId);
                if (!podcast) {
                    return response_utility_1.ResponseUtil.error(res, 'Podcast not found', 404);
                }
                return response_utility_1.ResponseUtil.success(res, { podcast });
            }
            catch (error) {
                return response_utility_1.ResponseUtil.error(res, error);
            }
        });
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
    getUserPodcasts(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const podcasts = yield this.podcastService.findByUserId(req.user.id);
                return response_utility_1.ResponseUtil.success(res, { podcasts });
            }
            catch (error) {
                return response_utility_1.ResponseUtil.error(res, error);
            }
        });
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
    createPodcast(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Handle file upload
                yield new Promise((resolve, reject) => {
                    upload(req, res, (err) => {
                        if (err instanceof multer_1.default.MulterError) {
                            reject(new errors_1.AppError(`File upload error: ${err.message}`, 400));
                        }
                        else if (err) {
                            reject(new errors_1.AppError(err.message, 400));
                        }
                        resolve();
                    });
                });
                if (!req.file) {
                    throw new errors_1.AppError('Audio file is required', 400);
                }
                const data = podcast_dto_1.CreatePodcastSchema.parse(req.body);
                const podcast = yield this.podcastService.create(req.user.id, data, req.file);
                return response_utility_1.ResponseUtil.success(res, { podcast }, 'Podcast created successfully', 201);
            }
            catch (error) {
                return response_utility_1.ResponseUtil.error(res, error);
            }
        });
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
    updatePodcast(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const podcastId = parseInt(req.params.id);
                const data = podcast_dto_1.UpdatePodcastSchema.parse(req.body);
                const podcast = yield this.podcastService.update(podcastId, req.user.id, data);
                return response_utility_1.ResponseUtil.success(res, { podcast });
            }
            catch (error) {
                return response_utility_1.ResponseUtil.error(res, error);
            }
        });
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
    deletePodcast(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const podcastId = parseInt(req.params.id);
                yield this.podcastService.delete(podcastId, req.user.id);
                return response_utility_1.ResponseUtil.success(res, null, 'Podcast deleted successfully');
            }
            catch (error) {
                return response_utility_1.ResponseUtil.error(res, error);
            }
        });
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
    getStreamUrl(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const podcastId = parseInt(req.params.id);
                const streamUrl = yield this.podcastService.getStreamUrl(podcastId);
                return response_utility_1.ResponseUtil.success(res, { streamUrl });
            }
            catch (error) {
                return response_utility_1.ResponseUtil.error(res, error);
            }
        });
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
    searchPodcasts(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const query = req.query.q;
                if (!query) {
                    return response_utility_1.ResponseUtil.error(res, 'Search query is required', 400);
                }
                const podcasts = yield this.podcastService.search(query);
                return response_utility_1.ResponseUtil.success(res, { podcasts });
            }
            catch (error) {
                return response_utility_1.ResponseUtil.error(res, error);
            }
        });
    }
};
exports.PodcastController = PodcastController;
exports.PodcastController = PodcastController = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [inversify_2.Container])
], PodcastController);
