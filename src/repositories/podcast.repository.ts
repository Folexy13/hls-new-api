import { PrismaClient, Podcast } from '@prisma/client';
import { injectable, inject } from 'inversify';
import { IRepository } from '../types/types';

@injectable()
export class PodcastRepository implements IRepository<Podcast> {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {}

  async findAll(skip?: number, take?: number): Promise<{ podcasts: Podcast[]; total: number }> {
    const [podcasts, total] = await Promise.all([
      this.prisma.podcast.findMany({
        skip,
        take,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      this.prisma.podcast.count()
    ]);

    return { podcasts, total };
  }

  async findById(id: number): Promise<Podcast | null> {
    return this.prisma.podcast.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });
  }

  async findByUserId(userId: number): Promise<Podcast[]> {
    return this.prisma.podcast.findMany({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async create(data: Omit<Podcast, 'id' | 'createdAt' | 'updatedAt'>): Promise<Podcast> {
    return this.prisma.podcast.create({
      data,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });
  }

  async update(id: number, data: Partial<Podcast>): Promise<Podcast> {
    return this.prisma.podcast.update({
      where: { id },
      data,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.podcast.delete({
      where: { id }
    });
  }

  async search(query: string): Promise<Podcast[]> {
    return this.prisma.podcast.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }
}
