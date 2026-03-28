"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const express_1 = __importDefault(require("express"));
const morgan_1 = __importDefault(require("morgan"));
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const container_1 = require("./config/container");
const routes_1 = require("./routes");
const cors_1 = __importDefault(require("cors")); // Fixed the import statement
const node_cron_1 = __importDefault(require("node-cron"));
const axios_1 = __importDefault(require("axios"));
require("dotenv/config");
const PORT = process.env.PORT || 3000;
const app = (0, express_1.default)();
// Middleware
app.use((0, morgan_1.default)("dev")); // Adds HTTP request logging
app.use(express_1.default.json());
app.use((0, cors_1.default)({
    origin: [
        "https://www.hlsnigeria.com",
        "https://hlsnigeria.com",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002"
    ], // or an array of allowed origins
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
}));
// Swagger configuration
const swaggerOptions = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "HLS API ",
            version: "1.0.0",
            description: "API Documentation",
        },
        servers: [
            {
                url: process.env.ENVIRONMENT === "dev"
                    ? `http://localhost:${PORT}`
                    : "https://hls-new-api.onrender.com",
            },
        ],
    },
    apis: ["./src/routes/*.ts", "./src/controllers/*.ts"],
};
const swaggerDocs = (0, swagger_jsdoc_1.default)(swaggerOptions);
app.use("/doc", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerDocs));
// Routes
const routeLogger_1 = require("./utilities/routeLogger");
const apiRouter = (0, routes_1.createRoutes)(container_1.container);
app.use("/api/v2", apiRouter);
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`API Documentation available at http://localhost:${PORT}/doc`);
    // Log all registered routes (colorized)
    (0, routeLogger_1.logRoutes)(apiRouter, '/api/v2');
    // Cron job to keep Render instance active - runs every 6 seconds
    node_cron_1.default.schedule('*/6 * * * * *', async () => {
        try {
            const baseUrl = process.env.ENVIRONMENT === "dev"
                ? `http://localhost:${PORT}`
                : "https://hls-new-api.onrender.com";
            // Make a simple GET request to keep the instance alive
            await axios_1.default.get(`${baseUrl}/api/v2/ping`, {
                timeout: 5000, // 5 second timeout
                headers: {
                    'User-Agent': 'Keep-Alive-Cron'
                }
            });
            console.log(`🏓 Keep-alive ping sent at ${new Date().toISOString()}`);
        }
        catch (error) {
            console.log(`❌ Keep-alive ping failed: ${error?.message || 'Unknown error'}`);
        }
    });
    console.log('🕒 Keep-alive cron job started (runs every 6 seconds)');
});
//# sourceMappingURL=app.js.map