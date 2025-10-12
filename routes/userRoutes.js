// routes/userRoutes.js
import express from 'express';
import { registerUser} from '../controllers/userController.js';
import { sendVerificationCode, verifyCode } from '../controllers/verificationController.js';

const router = express.Router();



router.post("/send-code", sendVerificationCode);
router.post("/verify-code", verifyCode);

router.post('/register', registerUser);

export default router;