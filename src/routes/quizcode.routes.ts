import { Router } from 'express';
import { Container } from 'inversify';
import { QuizCodeController } from '../controllers/quizcode.controller';
import { AuthGuard } from '../middlewares/auth.guard';

export const createQuizCodeRoutes = (container: Container): Router => {
  const router = Router();
  const quizCodeController = container.get(QuizCodeController);
  const authGuard = container.get(AuthGuard);

  // Public route - validate quiz code
  router.post('/validate', quizCodeController.validateQuizCode);

  // Protected routes - require authentication
  router.post('/create', authGuard.verify(), quizCodeController.createQuizCode);
  router.get('/my-codes', authGuard.verify(), quizCodeController.getMyQuizCodes);
  router.delete('/:id', authGuard.verify(), quizCodeController.deleteQuizCode);

  return router;
};
