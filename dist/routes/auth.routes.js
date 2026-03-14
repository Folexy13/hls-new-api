"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthRoutes = void 0;
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const createAuthRoutes = (container) => {
    const router = (0, express_1.Router)();
    const authController = container.get(auth_controller_1.AuthController);
    router.post('/register', authController.register.bind(authController));
    router.post('/login', authController.login.bind(authController));
    router.post('/refresh', authController.refreshToken.bind(authController));
    router.post('/logout', authController.logout.bind(authController));
    return router;
};
exports.createAuthRoutes = createAuthRoutes;
//# sourceMappingURL=auth.routes.js.map