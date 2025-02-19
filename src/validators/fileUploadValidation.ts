import type { Request, Response, NextFunction } from "express";
import multer, { MulterError } from "multer";
import type { ValidationChain, ValidationError } from "express-validator";
import { check, validationResult } from "express-validator";



// Allowed file types for upload
const allowedFileTypes = ["image/jpeg", "image/png", "application/pdf"];

/**
 * Multer setup for file uploads with file size limit and file type checking.
 */
const upload = multer({
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB file size limit
  },
  fileFilter: (_req, file, cb): void => {
    if (!allowedFileTypes.includes(file.mimetype)) {
      return cb(new MulterError("LIMIT_UNEXPECTED_FILE", "Invalid file type. Only JPEG, PNG, and PDF are allowed."));
    }
    cb(null, true);
  },
}).single("file");

/**
 * Middleware to handle file upload validation using Multer.
 */
export const multerMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  void upload(req, res, (err) => {
    if (err) {
      if (err instanceof MulterError) {
        // Handle Multer-specific errors
        res.status(400).json({
          success: false,
          errors: [
            {
              field: "file",
              message: `Multer error: ${err.message}`,
            },
          ],
        });
      } else {
        // Handle other errors
        res.status(500).json({
          success: false,
          errors: [
            {
              field: "file",
              message: `Server error: ${err instanceof Error ? err.message : "Unknown error"}`,
            },
          ],
        });
      }
      return; // Stop further processing
    }

    if (!req.file) {
      // Handle case where no file was uploaded
      res.status(400).json({
        success: false,
        errors: [
          {
            field: "file",
            message: "No file uploaded",
          },
        ],
      });
      return; // Stop further processing
    }

    next(); // Proceed to the next middleware if no errors
  });
};



/**
 * Validation for additional file upload fields.
 */
export const fileFieldValidation: ValidationChain[] = [
  check("description")
    .optional()
    .isLength({ max: 300 })
    .withMessage("Description cannot be more than 300 characters.")
    .trim()
    .escape(), // Sanitize to prevent XSS
];

/**
 * Type guard to check if an error is a ValidationError with a `param` property.
 */
const isValidationErrorWithParam = (error: ValidationError): error is ValidationError & { param: string } => {
  return "param" in error && typeof error.param === "string";
};

/**
 * Reusable validation middleware to handle validation results and send structured errors.
 */
export const validationMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((error) => {
      if (isValidationErrorWithParam(error)) {
        return {
          field: error.param,
          message: error.msg,
        };
      }
      // Fallback for errors without `param`
      return {
        field: "unknown",
        message: error.msg,
      };
    });

    res.status(400).json({
      success: false,
      errors: formattedErrors,
    });

    return; // Explicitly terminate the middleware function
  }

  next(); // Proceed to the next middleware if no errors
};