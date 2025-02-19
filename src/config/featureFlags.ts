import fs from "fs";
import path from "path";
import logger from "../utils/winstonLogger"; // Adjust the path as needed

/**
 * Feature flags allow for toggling features on/off dynamically.
 * This module supports environment-based and runtime overrides.
 */

// Define feature flags and their default states
const defaultFeatureFlags = {
  enableBetaFeatures: false,
  enableDarkMode: true,
  enableHighContrastMode: false,
  enableChat: true,
  enableNotifications: true,
  enableAdvancedAnalytics: false,
  enableTaskPrioritization: true,
  enableGoalCollaboration: true,
};

/**
 * @desc    Load feature flag overrides from a JSON file, if available.
 * @returns {Partial<typeof defaultFeatureFlags>} Feature flag overrides from file.
 */
const loadFeatureFlagsFromFile = (): Partial<typeof defaultFeatureFlags> => {
  try {
    const configPath = path.resolve(__dirname, "../config/featureFlags.json");
    if (fs.existsSync(configPath)) {
      const fileData = fs.readFileSync(configPath, "utf-8");
      return JSON.parse(fileData) as Partial<typeof defaultFeatureFlags>;
    }
  } catch (error) {
    logger.warn("Failed to load feature flags from file: " + (error as Error).message);
  }
  return {};
};

/**
 * @desc    Merge environment variables with default feature flags.
 * @returns {Partial<typeof defaultFeatureFlags>} Feature flag overrides from environment.
 */
const loadFeatureFlagsFromEnv = (): Partial<typeof defaultFeatureFlags> => {
  const flags: Partial<typeof defaultFeatureFlags> = {};

  if (process.env.FEATURE_ENABLE_BETA_FEATURES === "true")
    flags.enableBetaFeatures = true;

  if (process.env.FEATURE_ENABLE_ADVANCED_ANALYTICS === "true")
    flags.enableAdvancedAnalytics = true;

  if (process.env.FEATURE_ENABLE_CHAT === "false") flags.enableChat = false;

  return flags;
};

// Combine all sources of feature flags
const featureFlags = {
  ...defaultFeatureFlags,
  ...loadFeatureFlagsFromFile(),
  ...loadFeatureFlagsFromEnv(),
};

/**
 * @desc    Check if a feature is enabled.
 * @param   {keyof typeof featureFlags} feature - The feature flag to check.
 * @returns {boolean} Whether the feature is enabled.
 */
export const isFeatureEnabled = (feature: keyof typeof featureFlags): boolean => {
  return Boolean(featureFlags[feature]);
};

// Export feature flags for runtime usage
export default featureFlags;
