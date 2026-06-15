import { Router } from 'express';
import { Container } from 'inversify';
import { AuthGuard } from '../middlewares/auth.guard';
import { ContentController } from '../controllers/content.controller';
import { authenticatedHandler } from '../utilities/response.utility';

export const createContentRoutes = (container: Container): Router => {
  const router = Router();
  const authGuard = container.get(AuthGuard);
  const contentController = container.get(ContentController);

  router.get('/public/articles', authenticatedHandler(contentController.getPublicArticles));
  router.get('/public/articles/:id/comments', authenticatedHandler(contentController.getPublicArticleComments));
  router.post('/public/articles/:id/comments', authGuard.verify(), authenticatedHandler(contentController.createArticleComment));
  router.get('/public/articles/:id', authenticatedHandler(contentController.getPublicArticle));
  router.get('/principal/articles', authGuard.verify(), authenticatedHandler(contentController.getPrincipalArticles));
  router.post('/principal/articles', authGuard.verify(), authenticatedHandler(contentController.createArticle));
  router.get('/principal/articles/:id', authGuard.verify(), authenticatedHandler(contentController.getPrincipalArticle));
  router.patch('/principal/articles/:id', authGuard.verify(), authenticatedHandler(contentController.updateArticle));
  router.delete('/principal/articles/:id', authGuard.verify(), authenticatedHandler(contentController.deleteArticle));
  router.post('/principal/articles/:id/comments/:commentId/replies', authGuard.verify(), authenticatedHandler(contentController.replyToArticleComment));
  router.get('/principal/podcasts', authGuard.verify(), authenticatedHandler(contentController.getPrincipalPodcasts));
  router.post('/principal/podcasts', authGuard.verify(), authenticatedHandler(contentController.createPodcast));
  router.get('/benfek', authGuard.verify(), authenticatedHandler(contentController.getBenfekContent));

  return router;
};
