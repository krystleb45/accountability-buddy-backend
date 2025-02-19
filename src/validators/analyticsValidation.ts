import { body, query } from "express-validator";

const validateUserAnalyticsQuery = [
  query("userId")
    .notEmpty()
    .withMessage("User ID is required.")
    .isUUID()
    .withMessage("User ID must be a valid UUID."),
  query("dateRange")
    .optional()
    .isString()
    .withMessage("Date range must be a string.")
    .matches(/^(last7days|last30days|lastYear|custom)$/)
    .withMessage(
      "Date range must be one of: last7days, last30days, lastYear, or custom.",
    ),
  query("customStartDate")
    .optional()
    .isISO8601()
    .withMessage("Custom start date must be in ISO8601 format."),
  query("customEndDate")
    .optional()
    .isISO8601()
    .withMessage("Custom end date must be in ISO8601 format.")
    .custom((value, { req }) => {
      if (
        req.query &&
        req.query.customStartDate &&
        new Date(value) < new Date(req.query.customStartDate)
      ) {
        throw new Error("Custom end date must be after the custom start date.");
      }
      return true;
    }),
];

const validateGoalAnalyticsQuery = [
  query("goalId")
    .notEmpty()
    .withMessage("Goal ID is required.")
    .isUUID()
    .withMessage("Goal ID must be a valid UUID."),
  query("metricType")
    .optional()
    .isIn(["progress", "completionRate", "timeSpent"])
    .withMessage(
      "Metric type must be one of: progress, completionRate, or timeSpent.",
    ),
];

const validatePlatformAnalyticsQuery = [
  query("metricType")
    .notEmpty()
    .withMessage("Metric type is required.")
    .isIn(["userGrowth", "activeUsers", "goalCreation", "subscriptionRate"])
    .withMessage(
      "Metric type must be one of: userGrowth, activeUsers, goalCreation, or subscriptionRate.",
    ),
  query("dateRange")
    .optional()
    .isString()
    .withMessage("Date range must be a string.")
    .matches(/^(last7days|last30days|lastYear|custom)$/)
    .withMessage(
      "Date range must be one of: last7days, last30days, lastYear, or custom.",
    ),
  query("customStartDate")
    .optional()
    .isISO8601()
    .withMessage("Custom start date must be in ISO8601 format."),
  query("customEndDate")
    .optional()
    .isISO8601()
    .withMessage("Custom end date must be in ISO8601 format.")
    .custom((value, { req }) => {
      if (
        req.query &&
        req.query.customStartDate &&
        new Date(value) < new Date(req.query.customStartDate)
      ) {
        throw new Error("Custom end date must be after the custom start date.");
      }
      return true;
    }),
];

const validateAnalyticsReportGeneration = [
  body("reportType")
    .notEmpty()
    .withMessage("Report type is required.")
    .isIn(["user", "goal", "platform"])
    .withMessage("Report type must be one of: user, goal, or platform."),
  body("userId")
    .optional()
    .isUUID()
    .withMessage("User ID must be a valid UUID.")
    .custom((value, { req }) => {
      if (req.body.reportType === "user" && !value) {
        throw new Error("User ID is required for user reports.");
      }
      return true;
    }),
  body("goalId")
    .optional()
    .isUUID()
    .withMessage("Goal ID must be a valid UUID.")
    .custom((value, { req }) => {
      if (req.body.reportType === "goal" && !value) {
        throw new Error("Goal ID is required for goal reports.");
      }
      return true;
    }),
  body("dateRange")
    .optional()
    .isString()
    .withMessage("Date range must be a string.")
    .matches(/^(last7days|last30days|lastYear|custom)$/)
    .withMessage(
      "Date range must be one of: last7days, last30days, lastYear, or custom.",
    ),
  body("customStartDate")
    .optional()
    .isISO8601()
    .withMessage("Custom start date must be in ISO8601 format."),
  body("customEndDate")
    .optional()
    .isISO8601()
    .withMessage("Custom end date must be in ISO8601 format.")
    .custom((value, { req }) => {
      if (
        req.body.customStartDate &&
        new Date(value) < new Date(req.body.customStartDate)
      ) {
        throw new Error("Custom end date must be after the custom start date.");
      }
      return true;
    }),
];

export default {
  validateUserAnalyticsQuery,
  validateGoalAnalyticsQuery,
  validatePlatformAnalyticsQuery,
  validateAnalyticsReportGeneration,
};
