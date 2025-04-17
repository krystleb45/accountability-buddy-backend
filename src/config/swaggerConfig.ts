import type { Options } from "swagger-jsdoc";
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import type { Application } from "express";
import path from "path";
import express from "express";
import { logger } from "../utils/winstonLogger";

const env = process.env.NODE_ENV || "development";

const servers = [
  ...(env === "development" ? [{
    url: process.env.API_URL || "http://localhost:5050",
    description: "Local Development Server",
  }] : []),

  ...(env === "test" ? [{
    url: process.env.API_URL || "http://localhost:5005",
    description: "Test Server",
  }] : []),

  ...(env === "production" ? [{
    url: process.env.API_PROD_URL || "https://api.accountabilitybuddys.com",
    description: "Production Server",
  }] : []),
];

const swaggerOptions: Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Accountability Buddy API",
      version: "1.0.0",
      description: "Comprehensive API documentation for the Accountability Buddy project.",
      contact: {
        name: "API Support",
        email: process.env.API_SUPPORT_EMAIL || "support@accountabilitybuddys.com",
        url: process.env.SUPPORT_URL || "https://accountabilitybuddys.com/support",
      },
      termsOfService: process.env.API_TOS_URL || "https://accountabilitybuddys.com/terms",
      license: {
        name: process.env.API_LICENSE_NAME || "MIT",
        url: process.env.API_LICENSE_URL || "https://opensource.org/licenses/MIT",
      },
    },
    servers,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: 'JWT Authorization header using the Bearer scheme. Example: "Authorization: Bearer {token}"',
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [/* ... unchanged tag list ... */],
  },
  apis: ["./src/api/routes/**/*.ts", "./src/api/docs/**/*.yml"],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

// Conditionally enable Swagger only in dev/test unless explicitly turned on
const setupSwagger = (app: Application): void => {
  const enableDocs = process.env.ENABLE_SWAGGER === "true" || env !== "production";

  if (!enableDocs) {
    logger.info("🚫 Swagger UI is disabled in production.");
    return;
  }

  app.use("/assets", express.static(path.join(__dirname, "../../public/assets")));

  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customSiteTitle: "Accountability Buddy API Docs",
      customfavIcon: "/assets/favicon.ico",
      customCssUrl: "/assets/swagger-theme.css",
      customCss: `
        .swagger-ui .topbar { background-color: #0f172a; }
        .topbar-wrapper img { content: url('/assets/logo.svg'); height: 40px; }
        .swagger-ui .topbar .download-url-wrapper { display: none; }
        .swagger-ui .info hgroup.main a {
          font-weight: 600;
          font-size: 1.4em;
          color: #22c55e;
        }
      `,
    })
  );

  logger.info(`✅ Swagger UI available at /api-docs (${env})`);
};

export default setupSwagger;
