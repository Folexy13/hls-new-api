"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createQuizCodeRoutes = void 0;
const express_1 = require("express");
const quizcode_controller_1 = require("../controllers/quizcode.controller");
const auth_guard_1 = require("../middlewares/auth.guard");
const createQuizCodeRoutes = (container) => {
    const router = (0, express_1.Router)();
    const quizCodeController = container.get(quizcode_controller_1.QuizCodeController);
    const authGuard = container.get(auth_guard_1.AuthGuard);
    // Public route - validate quiz code
    router.post('/validate', quizCodeController.validateQuizCode);
    // Protected routes - require authentication
    router.post('/create', authGuard.verify(), quizCodeController.createQuizCode);
    router.get('/my-codes', authGuard.verify(), quizCodeController.getMyQuizCodes);
    router.delete('/:id', authGuard.verify(), quizCodeController.deleteQuizCode);
    return router;
};
exports.createQuizCodeRoutes = createQuizCodeRoutes;
//# sourceMappingURL=quizcode.routes.js.map