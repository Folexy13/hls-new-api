import { PrismaClient } from '@prisma/client';
import { injectable, inject } from 'inversify';
import { IRepository } from '../types/types';

// Define podcast type
interface Podcast {
  id: number;
  title: string;
  description: string;
  audioUrl: string;
  userId: number;
  user?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

@injectable()
export class PodcastRepository implements IRepository<Podcast> {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {}  async findAll(skip?: number, take?: number): Promise<{ items: Podcast[]; total: number }> {
    // Using raw queries to avoid Prisma model type issues
    const podcasts = await this.prisma.$queryRaw`
      SELECT p.id, p.title, p.description, p.audioUrl, p.userId, 
             p.createdAt, p.updatedAt,
             u.id as 'user.id', u.firstName as 'user.firstName',
             u.lastName as 'user.lastName', u.email as 'user.email'
      FROM Podcast p
      JOIN User u ON p.userId = u.id
      ORDER BY p.createdAt DESC
      LIMIT ${take || 50} OFFSET ${skip || 0}
    ` as any[];

    const totalResult = await this.prisma.$queryRaw`
      SELECT COUNT(*) as count FROM Podcast
    ` as Array<{ count: number }>;

    // Transform the flat results into nested objects
    const transformedPodcasts = podcasts.map(podcast => ({
      id: podcast.id,
      title: podcast.title,
      description: podcast.description,
      audioUrl: podcast.audioUrl,
      userId: podcast.userId,
      createdAt: podcast.createdAt,
      updatedAt: podcast.updatedAt,
      user: {
        id: podcast['user.id'],
        firstName: podcast['user.firstName'],
        lastName: podcast['user.lastName'],
        email: podcast['user.email']
      }
    }));

    return { 
      items: transformedPodcasts, 
      total: totalResult[0].count 
    };
  }
  async findById(id: number): Promise<Podcast | null> {
    const podcasts = await this.prisma.$queryRaw`
      SELECT p.id, p.title, p.description, p.audioUrl, p.userId, 
             p.createdAt, p.updatedAt,
             u.id as 'user.id', u.firstName as 'user.firstName',
             u.lastName as 'user.lastName', u.email as 'user.email'
      FROM Podcast p
      JOIN User u ON p.userId = u.id
      WHERE p.id = ${id}
    ` as any[];
    
    if (!podcasts.length) return null;
    
    // Transform to the expected format
    return {
      id: podcasts[0].id,
      title: podcasts[0].title,
      description: podcasts[0].description,
      audioUrl: podcasts[0].audioUrl,
      userId: podcasts[0].userId,
      createdAt: podcasts[0].createdAt,
      updatedAt: podcasts[0].updatedAt,
      user: {
        id: podcasts[0]['user.id'],
        firstName: podcasts[0]['user.firstName'],
        lastName: podcasts[0]['user.lastName'],
        email: podcasts[0]['user.email']
      }
    };
  }
  async findByUserId(userId: number): Promise<Podcast[]> {
    const podcasts = await this.prisma.$queryRaw`
      SELECT p.id, p.title, p.description, p.audioUrl, p.userId, 
             p.createdAt, p.updatedAt,
             u.id as 'user.id', u.firstName as 'user.firstName',
             u.lastName as 'user.lastName', u.email as 'user.email'
      FROM Podcast p
      JOIN User u ON p.userId = u.id
      WHERE p.userId = ${userId}
      ORDER BY p.createdAt DESC
    ` as any[];
    
    // Transform the flat results into nested objects
    return podcasts.map(podcast => ({
      id: podcast.id,
      title: podcast.title,
      description: podcast.description,
      audioUrl: podcast.audioUrl,
      userId: podcast.userId,
      createdAt: podcast.createdAt,
      updatedAt: podcast.updatedAt,
      user: {
        id: podcast['user.id'],
        firstName: podcast['user.firstName'],
        lastName: podcast['user.lastName'],
        email: podcast['user.email']
      }
    }));
  }
  async create(data: Omit<Podcast, 'id' | 'createdAt' | 'updatedAt'>): Promise<Podcast> {
    await this.prisma.$executeRaw`
      INSERT INTO Podcast (title, description, audioUrl, userId, createdAt, updatedAt)
      VALUES (${data.title}, ${data.description}, ${data.audioUrl}, ${data.userId}, NOW(), NOW())
    `;
    
    const result = await this.prisma.$queryRaw`
      SELECT id FROM Podcast 
      WHERE userId = ${data.userId} 
      ORDER BY id DESC LIMIT 1
    ` as { id: number }[];
    
    return this.findById(result[0].id) as Promise<Podcast>;
  }

  async update(id: number, data: Partial<Podcast>): Promise<Podcast> {
    const setClause = [];
    
    if (data.title !== undefined) {
      await this.prisma.$executeRaw`UPDATE Podcast SET title = ${data.title} WHERE id = ${id}`;
    }
    
    if (data.description !== undefined) {
      await this.prisma.$executeRaw`UPDATE Podcast SET description = ${data.description} WHERE id = ${id}`;
    }
    
    if (data.audioUrl !== undefined) {
      await this.prisma.$executeRaw`UPDATE Podcast SET audioUrl = ${data.audioUrl} WHERE id = ${id}`;
    }
    
    // Update the timestamp
    await this.prisma.$executeRaw`UPDATE Podcast SET updatedAt = NOW() WHERE id = ${id}`;
    
    return this.findById(id) as Promise<Podcast>;
  }
  async delete(id: number): Promise<void> {
    await this.prisma.$executeRaw`DELETE FROM Podcast WHERE id = ${id}`;
  }
  
  async search(query: string): Promise<Podcast[]> {
    const podcasts = await this.prisma.$queryRaw`
      SELECT p.id, p.title, p.description, p.audioUrl, p.userId, 
             p.createdAt, p.updatedAt,
             u.id as 'user.id', u.firstName as 'user.firstName',
             u.lastName as 'user.lastName', u.email as 'user.email'
      FROM Podcast p
      JOIN User u ON p.userId = u.id
      WHERE p.title LIKE ${'%' + query + '%'} OR p.description LIKE ${'%' + query + '%'}
      ORDER BY p.createdAt DESC
    ` as any[];
    
    // Transform the flat results into nested objects
    return podcasts.map(podcast => ({
      id: podcast.id,
      title: podcast.title,
      description: podcast.description,
      audioUrl: podcast.audioUrl,
      userId: podcast.userId,
      createdAt: podcast.createdAt,
      updatedAt: podcast.updatedAt,
      user: {
        id: podcast['user.id'],
        firstName: podcast['user.firstName'],
        lastName: podcast['user.lastName'],
        email: podcast['user.email']
      }
    }));
  }
}
