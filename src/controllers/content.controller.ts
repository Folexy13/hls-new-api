import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { PrismaClient } from '@prisma/client';
import { z, ZodError } from 'zod';
import { AuthenticatedRequest } from '../types/auth.types';
import { ResponseUtil } from '../utilities/response.utility';
import { normalizeHealthField } from '../utilities/health-field.utility';

const ContentTagsSchema = z
  .object({
    allergies: z.array(z.string()).optional().default([]),
    scares: z.array(z.string()).optional().default([]),
    familyCondition: z.array(z.string()).optional().default([]),
    medications: z.array(z.string()).optional().default([]),
    currentConditions: z.array(z.string()).optional().default([]),
    lifestyle: z.array(z.string()).optional().default([]),
    preferences: z.array(z.string()).optional().default([]),
  })
  .partial()
  .default({});

const ArticleSchema = z.object({
  title: z.string().trim().min(3),
  category: z.string().trim().min(2),
  description: z.string().trim().min(10),
  excerpt: z.string().trim().optional().nullable(),
  content: z.string().trim().min(10),
  imageUrl: z.string().trim().optional().nullable(),
  readTime: z.string().trim().optional().nullable(),
  status: z.enum(['draft', 'published', 'archived']).default('published'),
  tags: ContentTagsSchema,
});

const PodcastSchema = z.object({
  title: z.string().trim().min(3),
  description: z.string().trim().min(10),
  host: z.string().trim().optional().nullable(),
  category: z.string().trim().min(2),
  duration: z.string().trim().optional().nullable(),
  audioUrl: z.string().trim().optional().nullable(),
  thumbnailUrl: z.string().trim().optional().nullable(),
  status: z.enum(['draft', 'published', 'scheduled', 'archived']).default('published'),
  tags: ContentTagsSchema,
});

type ContentKind = 'articles' | 'podcasts';

@injectable()
export class ContentController {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {}

  private ensurePrincipal(req: AuthenticatedRequest, res: Response): boolean {
    if (req.user.role !== 'principal') {
      ResponseUtil.error(res, 'Only principals can manage content', 403);
      return false;
    }
    return true;
  }

  private parseTags(tags: unknown): Record<string, string[]> {
    if (!tags) return {};
    if (typeof tags === 'string') {
      try {
        return JSON.parse(tags);
      } catch {
        return {};
      }
    }
    return tags as Record<string, string[]>;
  }

  private hasAnyTag(tags: Record<string, string[]>): boolean {
    return Object.values(tags).some((values) => Array.isArray(values) && values.some((value) => value.trim()));
  }

  private buildBenfekTagSet(quizCode: any): Set<string> {
    const values = [
      ...Object.values({
        allergies: quizCode.allergies,
        scares: quizCode.scares,
        familyCondition: quizCode.familyCondition,
        medications: quizCode.medications,
        currentConditions: quizCode.currentConditions,
      }).flatMap((value) => normalizeHealthField(value) || []),
      ...(normalizeHealthField(quizCode.lifestyleHabits) || []),
      ...(normalizeHealthField(quizCode.lifestyleFun) || []),
      ...(normalizeHealthField(quizCode.lifestyleDesires) || []),
      ...(normalizeHealthField(quizCode.lifestylePriority) || []),
      ...(normalizeHealthField(quizCode.preferenceDrugForm) || []),
    ];

    return new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean));
  }

  private matchesBenfek(tags: Record<string, string[]>, benfekTags: Set<string>): boolean {
    if (!this.hasAnyTag(tags)) return true;

    return Object.values(tags)
      .flat()
      .map((value) => String(value || '').trim().toLowerCase())
      .filter(Boolean)
      .some((value) => benfekTags.has(value));
  }

  getPrincipalArticles = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!this.ensurePrincipal(req, res)) return;
      const rows = await this.prisma.$queryRawUnsafe<any[]>(
        `SELECT a.*, u.firstName, u.lastName
         FROM Article a
         INNER JOIN User u ON u.id = a.userId
         WHERE a.userId = ?
         ORDER BY a.createdAt DESC`,
        req.user.id
      );

      return ResponseUtil.success(res, {
        articles: rows.map((row) => ({
          ...row,
          tags: this.parseTags(row.tags),
          author: `${row.firstName || ''} ${row.lastName || ''}`.trim(),
        })),
      });
    } catch (error) {
      return ResponseUtil.error(res, 'Failed to retrieve articles', 500, error);
    }
  };

  getPublicArticles = async (_req: Request, res: Response) => {
    try {
      const rows = await this.prisma.$queryRawUnsafe<any[]>(
        `SELECT a.*, u.firstName, u.lastName
         FROM Article a
         INNER JOIN User u ON u.id = a.userId
         WHERE a.status = 'published'
         ORDER BY a.createdAt DESC`
      );

      return ResponseUtil.success(res, {
        articles: rows.map((row) => ({
          ...row,
          tags: this.parseTags(row.tags),
          author: `${row.firstName || ''} ${row.lastName || ''}`.trim() || 'Principal',
        })),
      });
    } catch (error) {
      return ResponseUtil.error(res, 'Failed to retrieve public articles', 500, error);
    }
  };

  getPublicArticle = async (req: Request, res: Response) => {
    try {
      const articleId = Number(req.params.id);
      if (!Number.isFinite(articleId)) return ResponseUtil.error(res, 'Invalid article id', 400);

      const rows = await this.prisma.$queryRawUnsafe<any[]>(
        `SELECT a.*, u.firstName, u.lastName
         FROM Article a
         INNER JOIN User u ON u.id = a.userId
         WHERE a.id = ? AND a.status = 'published'
         LIMIT 1`,
        articleId
      );

      if (!rows.length) return ResponseUtil.error(res, 'Article not found', 404);

      const row = rows[0];
      return ResponseUtil.success(res, {
        article: {
          ...row,
          tags: this.parseTags(row.tags),
          author: `${row.firstName || ''} ${row.lastName || ''}`.trim() || 'Principal',
        },
      });
    } catch (error) {
      return ResponseUtil.error(res, 'Failed to retrieve public article', 500, error);
    }
  };

  createArticle = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!this.ensurePrincipal(req, res)) return;
      const data = ArticleSchema.parse(req.body);
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO Article
         (title, description, content, category, status, userId, excerpt, imageUrl, readTime, tags, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), NOW(), NOW())`,
        data.title,
        data.description,
        data.content,
        data.category,
        data.status,
        req.user.id,
        data.excerpt || data.description.slice(0, 180),
        data.imageUrl || null,
        data.readTime || null,
        JSON.stringify(data.tags || {})
      );

      return ResponseUtil.success(res, null, 'Article created successfully', 201);
    } catch (error) {
      if (error instanceof ZodError) return ResponseUtil.error(res, 'Validation failed', 400, error);
      return ResponseUtil.error(res, 'Failed to create article', 500, error);
    }
  };

  getPrincipalArticle = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!this.ensurePrincipal(req, res)) return;
      const articleId = Number(req.params.id);
      if (!Number.isFinite(articleId)) return ResponseUtil.error(res, 'Invalid article id', 400);

      const rows = await this.prisma.$queryRawUnsafe<any[]>(
        `SELECT a.*, u.firstName, u.lastName
         FROM Article a
         INNER JOIN User u ON u.id = a.userId
         WHERE a.id = ? AND a.userId = ?
         LIMIT 1`,
        articleId,
        req.user.id
      );

      if (!rows.length) return ResponseUtil.error(res, 'Article not found', 404);

      const row = rows[0];
      return ResponseUtil.success(res, {
        article: {
          ...row,
          tags: this.parseTags(row.tags),
          author: `${row.firstName || ''} ${row.lastName || ''}`.trim(),
        },
      });
    } catch (error) {
      return ResponseUtil.error(res, 'Failed to retrieve article', 500, error);
    }
  };

  updateArticle = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!this.ensurePrincipal(req, res)) return;
      const articleId = Number(req.params.id);
      if (!Number.isFinite(articleId)) return ResponseUtil.error(res, 'Invalid article id', 400);

      const existing = await this.prisma.$queryRawUnsafe<any[]>(
        `SELECT id FROM Article WHERE id = ? AND userId = ? LIMIT 1`,
        articleId,
        req.user.id
      );
      if (!existing.length) return ResponseUtil.error(res, 'Article not found', 404);

      const data = ArticleSchema.parse(req.body);
      await this.prisma.$executeRawUnsafe(
        `UPDATE Article
         SET title = ?,
             description = ?,
             content = ?,
             category = ?,
             status = ?,
             excerpt = ?,
             imageUrl = ?,
             readTime = ?,
             tags = CAST(? AS JSON),
             updatedAt = NOW()
         WHERE id = ? AND userId = ?`,
        data.title,
        data.description,
        data.content,
        data.category,
        data.status,
        data.excerpt || data.description.slice(0, 180),
        data.imageUrl || null,
        data.readTime || null,
        JSON.stringify(data.tags || {}),
        articleId,
        req.user.id
      );

      return ResponseUtil.success(res, null, 'Article updated successfully');
    } catch (error) {
      if (error instanceof ZodError) return ResponseUtil.error(res, 'Validation failed', 400, error);
      return ResponseUtil.error(res, 'Failed to update article', 500, error);
    }
  };

  deleteArticle = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!this.ensurePrincipal(req, res)) return;
      const articleId = Number(req.params.id);
      if (!Number.isFinite(articleId)) return ResponseUtil.error(res, 'Invalid article id', 400);

      const result = await this.prisma.$executeRawUnsafe(
        `DELETE FROM Article WHERE id = ? AND userId = ?`,
        articleId,
        req.user.id
      );

      if (!result) return ResponseUtil.error(res, 'Article not found', 404);
      return ResponseUtil.success(res, null, 'Article deleted successfully');
    } catch (error) {
      return ResponseUtil.error(res, 'Failed to delete article', 500, error);
    }
  };

  getPrincipalPodcasts = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!this.ensurePrincipal(req, res)) return;
      const rows = await this.prisma.$queryRawUnsafe<any[]>(
        `SELECT p.*, u.firstName, u.lastName
         FROM Podcast p
         INNER JOIN User u ON u.id = p.userId
         WHERE p.userId = ?
         ORDER BY p.createdAt DESC`,
        req.user.id
      );

      return ResponseUtil.success(res, {
        podcasts: rows.map((row) => ({
          ...row,
          tags: this.parseTags(row.tags),
          host: row.host || `${row.firstName || ''} ${row.lastName || ''}`.trim(),
        })),
      });
    } catch (error) {
      return ResponseUtil.error(res, 'Failed to retrieve podcasts', 500, error);
    }
  };

  createPodcast = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!this.ensurePrincipal(req, res)) return;
      const data = PodcastSchema.parse(req.body);
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO Podcast
         (title, description, audioUrl, userId, host, category, duration, status, thumbnailUrl, tags, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), NOW(), NOW())`,
        data.title,
        data.description,
        data.audioUrl || null,
        req.user.id,
        data.host || null,
        data.category,
        data.duration || null,
        data.status,
        data.thumbnailUrl || null,
        JSON.stringify(data.tags || {})
      );

      return ResponseUtil.success(res, null, 'Podcast created successfully', 201);
    } catch (error) {
      if (error instanceof ZodError) return ResponseUtil.error(res, 'Validation failed', 400, error);
      return ResponseUtil.error(res, 'Failed to create podcast', 500, error);
    }
  };

  getBenfekContent = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user.role !== 'benfek') return ResponseUtil.error(res, 'Only benfeks can view this content', 403);

      const quizCode = await this.prisma.quizCode.findFirst({
        where: { usedBy: req.user.id, isUsed: true },
        orderBy: [{ usedAt: 'desc' }, { updatedAt: 'desc' }],
      } as any);

      if (!quizCode) return ResponseUtil.success(res, { articles: [], podcasts: [] });

      const benfekTags = this.buildBenfekTagSet(quizCode);
      const principalId = Number((quizCode as any).createdBy);
      const [articles, podcasts] = await Promise.all([
        this.prisma.$queryRawUnsafe<any[]>(
          `SELECT a.*, u.firstName, u.lastName
           FROM Article a
           INNER JOIN User u ON u.id = a.userId
           WHERE a.userId = ? AND a.status = 'published'
           ORDER BY a.createdAt DESC`,
          principalId
        ),
        this.prisma.$queryRawUnsafe<any[]>(
          `SELECT p.*, u.firstName, u.lastName
           FROM Podcast p
           INNER JOIN User u ON u.id = p.userId
           WHERE p.userId = ? AND p.status = 'published'
           ORDER BY p.createdAt DESC`,
          principalId
        ),
      ]);

      return ResponseUtil.success(res, {
        articles: articles
          .map((row) => ({ ...row, tags: this.parseTags(row.tags), author: `${row.firstName || ''} ${row.lastName || ''}`.trim() }))
          .filter((row) => this.matchesBenfek(row.tags, benfekTags)),
        podcasts: podcasts
          .map((row) => ({ ...row, tags: this.parseTags(row.tags), host: row.host || `${row.firstName || ''} ${row.lastName || ''}`.trim() }))
          .filter((row) => this.matchesBenfek(row.tags, benfekTags)),
      });
    } catch (error) {
      return ResponseUtil.error(res, 'Failed to retrieve benfek content', 500, error);
    }
  };
}
