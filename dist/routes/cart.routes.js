"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCartRoutes = void 0;
const express_1 = require("express");
const cart_controller_1 = require("../controllers/cart.controller");
const auth_guard_1 = require("../middlewares/auth.guard");
const response_utility_1 = require("../utilities/response.utility");
const createCartRoutes = (container) => {
    const router = (0, express_1.Router)();
    const cartController = container.get(cart_controller_1.CartController);
    const authGuard = container.get(auth_guard_1.AuthGuard);
    router.get('/', authGuard.verify(), (0, response_utility_1.authenticatedHandler)(cartController.getCart.bind(cartController)));
    router.post('/items', authGuard.verify(), (0, response_utility_1.authenticatedHandler)(cartController.addToCart.bind(cartController)));
    router.put('/items/:id', authGuard.verify(), (0, response_utility_1.authenticatedHandler)(cartController.updateCartItem.bind(cartController)));
    router.delete('/items/:id', authGuard.verify(), (0, response_utility_1.authenticatedHandler)(cartController.removeCartItem.bind(cartController)));
    router.delete('/', authGuard.verify(), (0, response_utility_1.authenticatedHandler)(cartController.clearCart.bind(cartController)));
    return router;
};
exports.createCartRoutes = createCartRoutes;
