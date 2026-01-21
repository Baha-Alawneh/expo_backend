// routes/userRoutes.js
import express from "express";
import { registerUser, loginUser, resetPassword } from "../controllers/userController.js";
import {
  sendVerificationCode,
  verifyCode,
  sendPasswordResetCode,
  verifyPasswordResetCode,
} from "../controllers/verificationController.js";
import {
  validateRegistration,
  validateLogin,
  validateEmail,
  validateVerificationCode,
} from "../middleware/validation.js";
import {
  authRateLimiter,
  strictRateLimiter,
} from "../middleware/rateLimiter.js";

const router = express.Router();

router.post(
  "/send-code",
  strictRateLimiter,
  validateEmail,
  sendVerificationCode
);
router.post("/verify-code", validateVerificationCode, verifyCode);
router.post("/login", authRateLimiter, validateLogin, loginUser);
router.post("/register", validateRegistration, registerUser);

// Password reset routes
router.post(
  "/forgot-password",
  strictRateLimiter,
  validateEmail,
  sendPasswordResetCode
);
router.post(
  "/verify-reset-code",
  validateVerificationCode,
  verifyPasswordResetCode
);
router.post("/reset-password", authRateLimiter, resetPassword);

export default router;
