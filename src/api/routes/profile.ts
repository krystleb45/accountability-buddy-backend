// src/api/routes/profile.ts
import { Router }    from "express";
import { check }     from "express-validator";
import multer        from "multer";
import { protect }   from "../middleware/authMiddleware";
import handleValidationErrors from "../middleware/handleValidationErrors";
import {
  getProfile,
  updateProfile,
  uploadProfileImage,
  uploadCoverImage,
} from "../controllers/ProfileController";

const router = Router();

// multer configs:
//  - avatars into uploads/avatars
//  - covers  into uploads/covers
const avatarUpload = multer({ dest: "uploads/avatars" });
const coverUpload  = multer({ dest: "uploads/covers" });

router.get("/", protect, getProfile);
router.put(
  "/",
  protect,
  [
    check("username").optional().isString(),
    check("email")   .optional().isEmail(),
    check("bio")     .optional().isString(),
    check("interests").optional().isArray(),
    handleValidationErrors,
  ],
  updateProfile
);

// alias
router.put("/update", protect, updateProfile);

// AVATAR → writes into uploads/avatars/<randomFilename>
router.put(
  "/image",
  protect,
  avatarUpload.single("profileImage"),
  uploadProfileImage
);

// COVER → writes into uploads/covers/<randomFilename>
router.put(
  "/cover",
  protect,
  coverUpload.single("coverImage"),
  uploadCoverImage
);

export default router;
