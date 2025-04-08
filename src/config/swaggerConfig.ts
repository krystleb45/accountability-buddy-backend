import type { Options } from "swagger-jsdoc";
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import type { Application } from "express";
import path from "path";
import express from "express";
import { logger } from "../utils/winstonLogger";

// Swagger options with TypeScript typing
const swaggerOptions: Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Accountability Buddy API",
      version: "1.0.0",
      description: "Comprehensive API documentation for the Accountability Buddy project.",
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
        url: process.env.API_URL || "http://localhost:5050/api",
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
          description: 'JWT Authorization header using the Bearer scheme. Example: "Authorization: Bearer {token}"',
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: "Auth", description: "Authentication-related endpoints" },
      { name: "Users", description: "User management endpoints" },
      { name: "API Keys", description: "Manage and control system API keys (Admin only)" },
      { name: "Tasks", description: "Task management endpoints" },
      { name: "Audit Logs", description: "Admin and Auditor access to system activity logs" },
      { name: "Challenges", description: "Gamified challenge endpoints" },
      { name: "Analytics", description: "Platform analytics and tracking" },
      { name: "Achievements", description: "User achievement system" },
      { name: "Newsletter", description: "Newsletter subscriptions and communication" },
      { name: "Payments", description: "Stripe payment and subscription logic" },
      { name: "Activity", description: "User logging and behavior activity" },
      { name: "Blog", description: "Endpoints related to blog post creation, retrieval, and interaction" },
      { name: "Books", description: "Endpoints for book recommendations and comments" },
      { name: "Chat", description: "Endpoints for private and group messaging" },
      { name: "Collaboration", description: "Collaborative goals and group accountability tracking" },
      { name: "Events", description: "Manage events, participation, and progress tracking" },
      { name: "Feed", description: "User goal progress feed & social interaction" },
      { name: "Feedback", description: "User feedback management" },
      { name: "File Upload", description: "Endpoints for uploading, downloading, and deleting chat files" },
      { name: "Files", description: "User file handling including secure uploads/downloads" },
      { name: "Follows", description: "Following/follower relationship management" },
      { name: "Friends", description: "Manage friend requests and interactions" },
      { name: "Gamification", description: "XP, levels, leaderboards, rewards, badges" },
      { name: "Goals", description: "Goal creation, tracking, and progress updates" },
      { name: "Goal Messages", description: "Messaging system tied to goals" },
      { name: "Groups", description: "User-created accountability groups" },
      { name: "History", description: "User history and logs" },
      { name: "Leaderboard", description: "Leaderboard viewing and ranking" },
      { name: "Milestones", description: "Milestone creation, update, and tracking" },
      { name: "Military Support", description: "Peer support and resources for veterans" },
      { name: "Notifications", description: "Push and in-app notification system" },
      { name: "Partner Support", description: "Goal partnership and accountability tracking" },
      { name: "Polls", description: "Poll creation, voting, and result tracking" },
      { name: "Profile", description: "View and update user profile details" },
      { name: "Progress", description: "User progress tracking and reset" },
      { name: "Reminders", description: "Create, update, and delete reminders" },
      { name: "Reports", description: "User-generated reports (admin review)" },
      { name: "Rewards", description: "Reward claiming and history tracking" },
      { name: "Roles", description: "RBAC role creation and enforcement" },
      { name: "Search", description: "Global and scoped search functionality" },
      { name: "Session", description: "Session login/logout and refresh" },
      { name: "Settings", description: "Account and preference settings" },
      { name: "Streaks", description: "Daily check-ins and streak progress" },
      { name: "Subscriptions", description: "Trial and paid subscription logic" },
      { name: "Tracker", description: "Custom user behavior and progress tracker" },
      { name: "Notifications", description: "API for sending in-app, email, and gamified notifications" },
      { name: "XP History", description: "Endpoints for managing user XP gain and tracking history" },
    ],
  },
  apis: ["./src/api/routes/**/*.ts", "./src/api/docs/**/*.yml"],
};

// Generate Swagger spec
const swaggerSpec = swaggerJSDoc(swaggerOptions);

// Setup Swagger UI
const setupSwagger = (app: Application): void => {
  // Mount the new public assets folder
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

  logger.info("✅ Swagger UI available at /api-docs");
};

export default setupSwagger;
