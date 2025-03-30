/**
 * authConfig.ts
 *
 * Centralized configuration for authentication and authorization in the application.
 */

interface JwtConfig {
  secret: string;
  refreshSecret: string;
  expiresIn: string;
  refreshExpiresIn: string;
  issuer: string;
  audience: string;
}

interface OauthConfig {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
}

interface OauthSettings {
  google: OauthConfig;
  facebook: OauthConfig;
  github: OauthConfig;
}

interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireNumbers: boolean;
  requireSpecialCharacters: boolean;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface TokenRevocationConfig {
  redisEnabled: boolean;
  redisPrefix: string;
}

interface MfaConfig {
  enabled: boolean;
  methods: string[];
  secretKey: string;
}

interface EmailVerificationConfig {
  enabled: boolean;
  verificationExpiresIn: string;
}

interface SocialLoginConfig {
  enableGoogle: boolean;
  enableFacebook: boolean;
  enableGithub: boolean;
}

interface AuthConfig {
  jwt: JwtConfig;
  oauth: OauthSettings;
  passwordPolicy: PasswordPolicy;
  rateLimit: RateLimitConfig;
  tokenRevocation: TokenRevocationConfig;
  mfa: MfaConfig;
  emailVerification: EmailVerificationConfig;
  socialLogin: SocialLoginConfig;
}

const authConfig: AuthConfig = {
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || "default_jwt_secret",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "default_refresh_secret",
    expiresIn: process.env.JWT_EXPIRES_IN || "1h",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
    issuer: process.env.JWT_ISSUER || "accountability-buddy",
    audience: process.env.JWT_AUDIENCE || "accountability-buddy-users",
  },

  // OAuth Configuration
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      callbackUrl:
        process.env.GOOGLE_CALLBACK_URL ||
        "http://localhost:5000/auth/google/callback",
    },
    facebook: {
      clientId: process.env.FACEBOOK_CLIENT_ID || "",
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET || "",
      callbackUrl:
        process.env.FACEBOOK_CALLBACK_URL ||
        "http://localhost:5000/auth/facebook/callback",
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      callbackUrl:
        process.env.GITHUB_CALLBACK_URL ||
        "http://localhost:5000/auth/github/callback",
    },
  },

  // Password Policy Configuration
  passwordPolicy: {
    minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || "8", 10),
    requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE === "true",
    requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS === "true",
    requireSpecialCharacters:
      process.env.PASSWORD_REQUIRE_SPECIAL_CHARS === "true",
  },

  // Rate Limiting for Auth Routes
  rateLimit: {
    windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || "900000", 10),
    maxRequests: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || "10", 10),
  },

  // Token Revocation List Configuration
  tokenRevocation: {
    redisEnabled: process.env.REDIS_ENABLED === "true",
    redisPrefix: "revoked_tokens",
  },

  // Multi-Factor Authentication (MFA)
  mfa: {
    enabled: process.env.MFA_ENABLED === "true",
    methods: ["sms", "email", "authenticator"],
    secretKey: process.env.MFA_SECRET_KEY || "",
  },

  // Email Verification
  emailVerification: {
    enabled: process.env.EMAIL_VERIFICATION_ENABLED === "true",
    verificationExpiresIn: process.env.EMAIL_VERIFICATION_EXPIRES_IN || "1d",
  },

  // Social Login Toggle
  socialLogin: {
    enableGoogle: process.env.ENABLE_GOOGLE_LOGIN === "true",
    enableFacebook: process.env.ENABLE_FACEBOOK_LOGIN === "true",
    enableGithub: process.env.ENABLE_GITHUB_LOGIN === "true",
  },
};

export default authConfig;
