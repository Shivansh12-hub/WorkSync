import express from "express";
import { register, login } from "../controllers/authController.js";
import {
	validateAndSanitizeRegister,
	validateAndSanitizeLogin,
} from "../middleware/authValidation.middleware.js";
import { loginRateLimitGuard } from "../middleware/loginRateLimit.middleware.js";

const router = express.Router();

router.post("/register", validateAndSanitizeRegister, register);
router.post("/login", validateAndSanitizeLogin, loginRateLimitGuard, login);

export default router;