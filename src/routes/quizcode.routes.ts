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
  // Public route - verify benfek quiz code
  router.post('/verify-benfek', quizCodeController.verifyBenfekQuizCode);
  // Public route - get benfek quiz payload by code
  router.post('/benfek-quiz', quizCodeController.getBenfekQuizByCodePublic);
  // Public route - complete benfek quiz (no auth)
  router.post('/complete', quizCodeController.completeBenfekQuiz);

  // Protected routes - require authentication
  router.post('/use', authGuard.verify(), quizCodeController.useQuizCode);
  router.get('/benfeks', authGuard.verify(), quizCodeController.getMyBenfeks);
  router.get('/benfeks/:code', authGuard.verify(), quizCodeController.getBenfekQuizByCode);
  router.post('/create', authGuard.verify(), quizCodeController.createQuizCode);
  router.get('/my-codes', authGuard.verify(), quizCodeController.getMyQuizCodes);
  router.delete('/:id', authGuard.verify(), quizCodeController.deleteQuizCode);

  return router;
};
