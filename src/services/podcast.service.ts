import { injectable, inject } from 'inversify';
import { CreatePodcastDTO, UpdatePodcastDTO } from '../DTOs/podcast.dto';
import type { Podcast } from '@prisma/client';
import { AppError } from '../utilities/errors';
import { PodcastRepository } from '../repositories/podcast.repository';
import { S3Service } from '../utilities/s3.utility';

@injectable()
export class PodcastService {
  constructor(
    @inject(PodcastRepository) private podcastRepository: PodcastRepository,
    @inject(S3Service) private s3Service: S3Service
  ) {}  async findAll(page: number = 1, limit: number = 10): Promise<{ podcasts: Podcast[]; total: number }> {
    const skip = (page - 1) * limit;
    const result = await this.podcastRepository.findAll(skip, limit);
    return { podcasts: result.items, total: result.total };
  }

  async findById(id: number): Promise<Podcast | null> {
    return this.podcastRepository.findById(id);
  }

  async findByUserId(userId: number): Promise<Podcast[]> {
    return this.podcastRepository.findByUserId(userId);
  }

  async create(userId: number, data: CreatePodcastDTO, file: Express.Multer.File): Promise<Podcast> {
    // Upload audio file to S3
    const { url: audioUrl, key } = await this.s3Service.uploadFile(file);

    try {
      // Create podcast record in database
      return await this.podcastRepository.create({
        ...data,
        userId,
        audioUrl
      });
    } catch (error) {
      // If database creation fails, delete the uploaded file
      await this.s3Service.deleteFile(key);
      throw error;
    }
  }

  async update(id: number, userId: number, data: UpdatePodcastDTO): Promise<Podcast> {
    const podcast = await this.findById(id);
    
    if (!podcast) {
      throw new AppError('Podcast not found', 404);
    }

    // Ensure user owns the podcast
    if (podcast.userId !== userId) {
      throw new AppError('Unauthorized', 403);
    }

    return this.podcastRepository.update(id, data);
  }

  async delete(id: number, userId: number): Promise<void> {
    const podcast = await this.findById(id);
    
    if (!podcast) {
      throw new AppError('Podcast not found', 404);
    }

    // Ensure user owns the podcast
    if (podcast.userId !== userId) {
      throw new AppError('Unauthorized', 403);
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

  async getStreamUrl(id: number): Promise<string> {
    const podcast = await this.findById(id);
    
    if (!podcast) {
      throw new AppError('Podcast not found', 404);
    }

    // Extract the key from the audioUrl
    const key = podcast.audioUrl.split('/').pop();
    if (!key) {
      throw new AppError('Invalid audio URL', 500);
    }

    // Get signed URL for streaming
    return this.s3Service.getSignedUrl(`podcasts/${key}`);
  }

  async search(query: string): Promise<Podcast[]> {
    return this.podcastRepository.search(query);
  }
}
