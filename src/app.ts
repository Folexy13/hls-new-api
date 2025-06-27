import 'reflect-metadata';
import express from 'express';
import morgan from 'morgan';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { container } from './config/container';
import { createRoutes } from './routes';
import cors from 'cors'; // Fixed the import statement

const PORT = process.env.PORT || 3000;

const app = express();

// Middleware
app.use(morgan('dev')); // Adds HTTP request logging
app.use(express.json());
app.use(cors({

  origin: ['https://hls-new.netlify.app',"http://localhost:3000","https://deploy-preview-7--hls-new.netlify.app"], // or an array of allowed origins

  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

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
        url: process.env.ENVIRONMENT ==="dev"? `http://localhost:${PORT}`:"https://hls-new-api.onrender.com",
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

const swaggerDocs = swaggerJSDoc(swaggerOptions);
app.use('/doc', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Routes
app.use('/api/v2', createRoutes(container));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API Documentation available at http://localhost:${PORT}/doc`);
});
