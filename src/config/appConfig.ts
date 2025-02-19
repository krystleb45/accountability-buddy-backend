/**
 * appConfig.ts
 *
 * Centralized configuration for the application, including metadata, frontend-backend integration,
 * and other environment-specific settings.
 */

interface AppConfig {
  appName: string;
  version: string;
  environment: string;
  frontendUrl: string;
  apiBaseUrl: string;
  support: {
    email: string;
    url: string;
    termsOfService: string;
    privacyPolicy: string;
  };
  analytics: {
    enabled: boolean;
    googleAnalyticsId: string;
    mixpanelToken: string;
  };
  localization: {
    defaultLanguage: string;
    supportedLanguages: string[];
  };
  theme: {
    defaultTheme: string;
    themes: string[];
  };
  uploads: {
    maxFileSize: number;
    allowedFileTypes: string[];
  };
  features: {
    enableChat: boolean;
    enablePayments: boolean;
    enableGamification: boolean;
  };
  security: {
    corsAllowedOrigins: string[];
    passwordPolicy: {
      minLength: number;
      requireNumbers: boolean;
      requireSpecialChars: boolean;
    };
  };
  logging: {
    level: string;
    logDir: string;
  };
  documentation: {
    swaggerUrl: string;
    swaggerCustomCss: string;
  };
  testing: {
    skipPreflightCheck: boolean;
    enableMocks: boolean;
  };
}

const appConfig: AppConfig = {
  // General Application Information
  appName: process.env.APP_NAME || "Accountability Buddy",
  version: process.env.APP_VERSION || "1.0.0",
  environment: process.env.NODE_ENV || "development",

  // Frontend-Backend Integration
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  apiBaseUrl: process.env.API_BASE_URL || "http://localhost:5000/api",

  // Support and Contact Information
  support: {
    email: process.env.SUPPORT_EMAIL || "support@example.com",
    url: process.env.SUPPORT_URL || "https://example.com/support",
    termsOfService:
      process.env.TERMS_OF_SERVICE_URL || "https://example.com/terms",
    privacyPolicy:
      process.env.PRIVACY_POLICY_URL || "https://example.com/privacy-policy",
  },

  // Analytics Configuration
  analytics: {
    enabled: process.env.ENABLE_ANALYTICS === "true",
    googleAnalyticsId: process.env.GOOGLE_ANALYTICS_ID || "UA-XXXXX-Y",
    mixpanelToken: process.env.MIXPANEL_TOKEN || "",
  },

  // Localization Settings
  localization: {
    defaultLanguage: process.env.DEFAULT_LANGUAGE || "en",
    supportedLanguages: process.env.SUPPORTED_LANGUAGES
      ? process.env.SUPPORTED_LANGUAGES.split(",")
      : ["en", "es", "fr"], // Default to English, Spanish, and French
  },

  // Theme Configuration
  theme: {
    defaultTheme: process.env.DEFAULT_THEME || "light",
    themes: ["light", "dark", "highContrast"], // Supported themes
  },

  // File Upload Configuration
  uploads: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || "10485760", 10), // Default to 10MB
    allowedFileTypes: process.env.ALLOWED_FILE_TYPES
      ? process.env.ALLOWED_FILE_TYPES.split(",")
      : ["image/jpeg", "image/png", "application/pdf"], // Default file types
  },

  // Feature Flags
  features: {
    enableChat: process.env.ENABLE_CHAT === "true",
    enablePayments: process.env.ENABLE_PAYMENTS === "true",
    enableGamification: process.env.ENABLE_GAMIFICATION === "true",
  },

  // Security Settings
  security: {
    corsAllowedOrigins: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",")
      : ["http://localhost:3000"], // Default CORS origins
    passwordPolicy: {
      minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || "8", 10),
      requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS === "true",
      requireSpecialChars:
        process.env.PASSWORD_REQUIRE_SPECIAL_CHARS === "true",
    },
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || "info",
    logDir: process.env.LOG_DIR || "logs",
  },

  // API Documentation
  documentation: {
    swaggerUrl: "/api-docs",
    swaggerCustomCss: process.env.SWAGGER_CUSTOM_CSS || "",
  },

  // Testing
  testing: {
    skipPreflightCheck: process.env.SKIP_PREFLIGHT_CHECK === "true",
    enableMocks: process.env.ENABLE_MOCKS === "true",
  },
};

export default appConfig;
