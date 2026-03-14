"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNutrientTypeRoutes = void 0;
const express_1 = require("express");
const nutrienttype_controller_1 = require("../controllers/nutrienttype.controller");
const auth_guard_1 = require("../middlewares/auth.guard");
const response_utility_1 = require("../utilities/response.utility");
const createNutrientTypeRoutes = (container) => {
    const router = (0, express_1.Router)();
    const nutrientTypeController = container.get(nutrienttype_controller_1.NutrientTypeController);
    const authGuard = container.get(auth_guard_1.AuthGuard);
    router.get('/', (0, response_utility_1.authenticatedHandler)(nutrientTypeController.getNutrientTypes.bind(nutrientTypeController)));
    router.get('/code/:code', (0, response_utility_1.authenticatedHandler)(nutrientTypeController.getNutrientTypeByCode.bind(nutrientTypeController)));
    router.get('/:id', (0, response_utility_1.authenticatedHandler)(nutrientTypeController.getNutrientTypeById.bind(nutrientTypeController)));
    router.post('/', authGuard.verify(), (0, response_utility_1.authenticatedHandler)(nutrientTypeController.createNutrientType.bind(nutrientTypeController)));
    router.put('/:id', authGuard.verify(), (0, response_utility_1.authenticatedHandler)(nutrientTypeController.updateNutrientType.bind(nutrientTypeController)));
    router.delete('/:id', authGuard.verify(), (0, response_utility_1.authenticatedHandler)(nutrientTypeController.deleteNutrientType.bind(nutrientTypeController)));
    return router;
};
exports.createNutrientTypeRoutes = createNutrientTypeRoutes;
//# sourceMappingURL=nutrienttype.routes.js.map