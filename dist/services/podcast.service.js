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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PodcastService = void 0;
const inversify_1 = require("inversify");
const errors_1 = require("../utilities/errors");
const podcast_repository_1 = require("../repositories/podcast.repository");
const s3_utility_1 = require("../utilities/s3.utility");
let PodcastService = class PodcastService {
    constructor(podcastRepository, s3Service) {
        this.podcastRepository = podcastRepository;
        this.s3Service = s3Service;
    }
    async findAll(page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const result = await this.podcastRepository.findAll(skip, limit);
        return { podcasts: result.items, total: result.total };
    }
    async findById(id) {
        return this.podcastRepository.findById(id);
    }
    async findByUserId(userId) {
        return this.podcastRepository.findByUserId(userId);
    }
    async create(userId, data, file) {
        // Upload audio file to S3
        const { url: audioUrl, key } = await this.s3Service.uploadFile(file);
        try {
            // Create podcast record in database
            return await this.podcastRepository.create({
                ...data,
                userId,
                audioUrl
            });
        }
        catch (error) {
            // If database creation fails, delete the uploaded file
            await this.s3Service.deleteFile(key);
            throw error;
        }
    }
    async update(id, userId, data) {
        const podcast = await this.findById(id);
        if (!podcast) {
            throw new errors_1.AppError('Podcast not found', 404);
        }
        // Ensure user owns the podcast
        if (podcast.userId !== userId) {
            throw new errors_1.AppError('Unauthorized', 403);
        }
        return this.podcastRepository.update(id, data);
    }
    async delete(id, userId) {
        const podcast = await this.findById(id);
        if (!podcast) {
            throw new errors_1.AppError('Podcast not found', 404);
        }
        // Ensure user owns the podcast
        if (podcast.userId !== userId) {
            throw new errors_1.AppError('Unauthorized', 403);
        }
        // Extract the key from the audioUrl
        const key = podcast.audioUrl.split('/').pop();
        if (key) {
            // Delete file from S3
            await this.s3Service.deleteFile(`podcasts/${key}`);
        }
        // Delete podcast record from database
        await this.podcastRepository.delete(id);
    }
    async getStreamUrl(id) {
        const podcast = await this.findById(id);
        if (!podcast) {
            throw new errors_1.AppError('Podcast not found', 404);
        }
        // Extract the key from the audioUrl
        const key = podcast.audioUrl.split('/').pop();
        if (!key) {
            throw new errors_1.AppError('Invalid audio URL', 500);
        }
        // Get signed URL for streaming
        return this.s3Service.getSignedUrl(`podcasts/${key}`);
    }
    async search(query) {
        return this.podcastRepository.search(query);
    }
};
exports.PodcastService = PodcastService;
exports.PodcastService = PodcastService = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(podcast_repository_1.PodcastRepository)),
    __param(1, (0, inversify_1.inject)(s3_utility_1.S3Service)),
    __metadata("design:paramtypes", [podcast_repository_1.PodcastRepository,
        s3_utility_1.S3Service])
], PodcastService);
//# sourceMappingURL=podcast.service.js.map