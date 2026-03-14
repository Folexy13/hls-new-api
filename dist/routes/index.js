"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRoutes = void 0;
const express_1 = require("express");
const ping_controller_1 = require("../controllers/ping.controller");
const auth_routes_1 = require("./auth.routes");
const wallet_routes_1 = require("./wallet.routes");
const cart_routes_1 = require("./cart.routes");
const supplement_routes_1 = require("./supplement.routes");
const podcast_routes_1 = require("./podcast.routes");
const paystack_routes_1 = require("./paystack.routes");
const nutrienttype_routes_1 = require("./nutrienttype.routes");
const quizcode_routes_1 = require("./quizcode.routes");
const principal_routes_1 = require("./principal.routes");
const createRoutes = (container) => {
    const router = (0, express_1.Router)();
    const pingController = container.get(ping_controller_1.PingController);
    /**
     * @swagger
     * tags:
     *   name: Health
     *   description: Server health check endpoints
     */
    router.get('/ping', pingController.ping.bind(pingController));
    // Mount auth routes
    router.use('/auth', (0, auth_routes_1.createAuthRoutes)(container));
    // Mount wallet routes
    router.use('/wallet', (0, wallet_routes_1.createWalletRoutes)(container));
    // Mount cart routes
    router.use('/cart', (0, cart_routes_1.createCartRoutes)(container));
    // Mount supplement routes
    router.use('/supplements', (0, supplement_routes_1.createSupplementRoutes)(container));
    // Mount podcast routes
    router.use('/podcasts', (0, podcast_routes_1.createPodcastRoutes)(container));
    // Mount paystack routes
    router.use('/paystack', (0, paystack_routes_1.createPaystackRoutes)(container));
    //mount quiz/nutrient route
    router.use('/nutrient-types', (0, nutrienttype_routes_1.createNutrientTypeRoutes)(container));
    // Mount quiz code routes
    router.use('/quiz-code', (0, quizcode_routes_1.createQuizCodeRoutes)(container));
    // Mount principal routes
    router.use('/principals', (0, principal_routes_1.createPrincipalRoutes)(container));
    return router;
};
exports.createRoutes = createRoutes;
//# sourceMappingURL=index.js.map