"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
//import 'reflect-metadata';
const express_1 = __importDefault(require("express"));
const morgan_1 = __importDefault(require("morgan"));
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const container_1 = require("./config/container");
const routes_1 = require("./routes");
const PORT = process.env.PORT || 3000;
const app = (0, express_1.default)();
// Middleware
app.use((0, morgan_1.default)('dev')); // Adds HTTP request logging
app.use(express_1.default.json());
// Swagger configuration
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'HLS API ',
            version: '1.0.0',
            description: 'API Documentation',
        },
        servers: [
            {
                url: `http://localhost:${PORT}`,
            },
        ],
    },
    apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};
const swaggerDocs = (0, swagger_jsdoc_1.default)(swaggerOptions);
app.use('/doc', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerDocs));
// Routes
app.use('/api/v2', (0, routes_1.createRoutes)(container_1.container));
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`API Documentation available at http://localhost:${PORT}/doc`);
});
