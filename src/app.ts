import "reflect-metadata";
import express from "express";
import morgan from "morgan";
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { container } from "./config/container";
import { createRoutes } from "./routes";
import cors from "cors"; // Fixed the import statement
import cron from "node-cron";
import axios from "axios";
import 'dotenv/config'
const PORT = process.env.PORT || 3000;

const app = express();

// Middleware
app.use(morgan("dev")); // Adds HTTP request logging
app.use(express.json());
app.use(
  cors({
    origin: [
      "https://www.hlsnigeria.com",
      "https://hlsnigeria.com",
      "http://localhost:3000",
      "http://localhost:3001",
      "https://hls-testing.netlify.app",
      "http://localhost:3002"
    ], // or an array of allowed origins

    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

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
        url:
          process.env.ENVIRONMENT === "dev"
            ? `http://localhost:${PORT}`
            : "https://hls-new-api.onrender.com",
      },
    ],
  },
  apis: ["./src/routes/*.ts", "./src/controllers/*.ts"],
};

const swaggerDocs = swaggerJSDoc(swaggerOptions);
app.use("/doc", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Routes
import { logRoutes } from './utilities/routeLogger';
const apiRouter = createRoutes(container);
app.use("/api/v2", apiRouter);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API Documentation available at http://localhost:${PORT}/doc`);
  // Log all registered routes (colorized)
  logRoutes(apiRouter, '/api/v2');

  // Cron job to keep Render instance active - runs every 6 seconds
  cron.schedule('*/6 * * * * *', async () => {
    try {
      const baseUrl = process.env.ENVIRONMENT === "dev" 
        ? `http://localhost:${PORT}` 
        : "https://hls-new-api.onrender.com";
      
      // Make a simple GET request to keep the instance alive
      await axios.get(`${baseUrl}/api/v2/ping`, {
        timeout: 5000, // 5 second timeout
        headers: {
          'User-Agent': 'Keep-Alive-Cron'
        }
      });
      
      console.log(`🏓 Keep-alive ping sent at ${new Date().toISOString()}`);
    } catch (error: any) {
      console.log(`❌ Keep-alive ping failed: ${error?.message || 'Unknown error'}`);
    }
  });

  console.log('🕒 Keep-alive cron job started (runs every 6 seconds)');
});
