import type { Options } from "swagger-jsdoc";
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import type { Application } from "express";
import logger from "../utils/winstonLogger"; // Adjust the path as needed

// Swagger options with TypeScript typing
const swaggerOptions: Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Accountability Buddy API",
      version: "1.0.0",
      description:
        "Comprehensive API documentation for the Accountability Buddy project.",
      contact: {
        name: "API Support",
        email: process.env.API_SUPPORT_EMAIL || "support@example.com",
        url: process.env.SUPPORT_URL || "https://example.com/support",
      },
      termsOfService: process.env.API_TOS_URL || "https://example.com/terms",
      license: {
        name: process.env.API_LICENSE_NAME || "MIT",
        url: process.env.API_LICENSE_URL || "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: process.env.API_URL || "http://localhost:5000/api",
        description: "Local development server",
      },
      {
        url: process.env.API_STAGE_URL || "https://staging.yourdomain.com",
        description: "Staging server",
      },
      {
        url: process.env.API_PROD_URL || "https://api.yourdomain.com",
        description: "Production server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: "Auth",
        description: "Authentication-related endpoints",
      },
      {
        name: "Users",
        description: "User management endpoints",
      },
      {
        name: "Tasks",
        description: "Task management endpoints",
      },
    ],
  },
  apis: ["./src/routes/*.ts", "./src/docs/*.yml"], // Adjust paths based on your project structure
};

// Generate the Swagger specification
const swaggerSpec = swaggerJSDoc(swaggerOptions);

// Function to set up Swagger UI
const setupSwagger = (app: Application): void => {
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customCssUrl: process.env.SWAGGER_CUSTOM_CSS || "",
      customSiteTitle: "Accountability Buddy API Docs",
    }),
  );

  // Replace console.log with logger
  logger.info("Swagger UI available at /api-docs");
};

export default setupSwagger;
