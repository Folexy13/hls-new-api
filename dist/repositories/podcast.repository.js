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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PodcastRepository = void 0;
const client_1 = require("@prisma/client");
const inversify_1 = require("inversify");
let PodcastRepository = class PodcastRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    findAll(skip, take) {
        return __awaiter(this, void 0, void 0, function* () {
            // Using raw queries to avoid Prisma model type issues
            const podcasts = yield this.prisma.$queryRaw `
      SELECT p.id, p.title, p.description, p.audioUrl, p.userId, 
             p.createdAt, p.updatedAt,
             u.id as 'user.id', u.firstName as 'user.firstName',
             u.lastName as 'user.lastName', u.email as 'user.email'
      FROM Podcast p
      JOIN User u ON p.userId = u.id
      ORDER BY p.createdAt DESC
      LIMIT ${take || 50} OFFSET ${skip || 0}
    `;
            const totalResult = yield this.prisma.$queryRaw `
      SELECT COUNT(*) as count FROM Podcast
    `;
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
        });
    }
    findById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const podcasts = yield this.prisma.$queryRaw `
      SELECT p.id, p.title, p.description, p.audioUrl, p.userId, 
             p.createdAt, p.updatedAt,
             u.id as 'user.id', u.firstName as 'user.firstName',
             u.lastName as 'user.lastName', u.email as 'user.email'
      FROM Podcast p
      JOIN User u ON p.userId = u.id
      WHERE p.id = ${id}
    `;
            if (!podcasts.length)
                return null;
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
        });
    }
    findByUserId(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const podcasts = yield this.prisma.$queryRaw `
      SELECT p.id, p.title, p.description, p.audioUrl, p.userId, 
             p.createdAt, p.updatedAt,
             u.id as 'user.id', u.firstName as 'user.firstName',
             u.lastName as 'user.lastName', u.email as 'user.email'
      FROM Podcast p
      JOIN User u ON p.userId = u.id
      WHERE p.userId = ${userId}
      ORDER BY p.createdAt DESC
    `;
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
        });
    }
    create(data) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.prisma.$executeRaw `
      INSERT INTO Podcast (title, description, audioUrl, userId, createdAt, updatedAt)
      VALUES (${data.title}, ${data.description}, ${data.audioUrl}, ${data.userId}, NOW(), NOW())
    `;
            const result = yield this.prisma.$queryRaw `
      SELECT id FROM Podcast 
      WHERE userId = ${data.userId} 
      ORDER BY id DESC LIMIT 1
    `;
            return this.findById(result[0].id);
        });
    }
    update(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const setClause = [];
            if (data.title !== undefined) {
                yield this.prisma.$executeRaw `UPDATE Podcast SET title = ${data.title} WHERE id = ${id}`;
            }
            if (data.description !== undefined) {
                yield this.prisma.$executeRaw `UPDATE Podcast SET description = ${data.description} WHERE id = ${id}`;
            }
            if (data.audioUrl !== undefined) {
                yield this.prisma.$executeRaw `UPDATE Podcast SET audioUrl = ${data.audioUrl} WHERE id = ${id}`;
            }
            // Update the timestamp
            yield this.prisma.$executeRaw `UPDATE Podcast SET updatedAt = NOW() WHERE id = ${id}`;
            return this.findById(id);
        });
    }
    delete(id) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.prisma.$executeRaw `DELETE FROM Podcast WHERE id = ${id}`;
        });
    }
    search(query) {
        return __awaiter(this, void 0, void 0, function* () {
            const podcasts = yield this.prisma.$queryRaw `
      SELECT p.id, p.title, p.description, p.audioUrl, p.userId, 
             p.createdAt, p.updatedAt,
             u.id as 'user.id', u.firstName as 'user.firstName',
             u.lastName as 'user.lastName', u.email as 'user.email'
      FROM Podcast p
      JOIN User u ON p.userId = u.id
      WHERE p.title LIKE ${'%' + query + '%'} OR p.description LIKE ${'%' + query + '%'}
      ORDER BY p.createdAt DESC
    `;
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
        });
    }
};
exports.PodcastRepository = PodcastRepository;
exports.PodcastRepository = PodcastRepository = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], PodcastRepository);
