import express from "express";
import protect from "../middleware/auth.middleware.js";
import authorizeRoles from "../middleware/role.middleware.js";
import { addFeedback, getFeedbackByUpdateId } from "../controllers/feedBackController.js";

const router = express.Router();

router.post(
  "/",
  protect,
  authorizeRoles("MANAGER", "ADMIN"),
  addFeedback
);

router.get("/:updateId", protect, getFeedbackByUpdateId);

export default router;