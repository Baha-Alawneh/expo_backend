// routes/userRoutes.js
import express from "express";
import { registerUser, loginUser } from "../controllers/userController.js";
import {
  sendVerificationCode,
  verifyCode,
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

export default router;
