"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPaystackRoutes = void 0;
const paystack_controller_1 = require("../controllers/paystack.controller");
const express_1 = require("express");
const auth_guard_1 = require("../middlewares/auth.guard");
const response_utility_1 = require("../utilities/response.utility");
const createPaystackRoutes = (container) => {
    const router = (0, express_1.Router)();
    const paystackController = container.get(paystack_controller_1.PaystackController);
    const authGuard = container.get(auth_guard_1.AuthGuard);
    router.post('/initialize', authGuard.verify(), (0, response_utility_1.authenticatedHandler)(paystackController.initializeCheckout));
    router.get('/verify/:reference', authGuard.verify(), (0, response_utility_1.authenticatedHandler)(paystackController.verifyCheckout));
    router.post('/checkout', authGuard.verify(), (0, response_utility_1.authenticatedHandler)(paystackController.checkoutFromCart));
    return router;
};
exports.createPaystackRoutes = createPaystackRoutes;
//# sourceMappingURL=paystack.routes.js.map