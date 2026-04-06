import express from "express";
import protect from "../middleware/auth.middleware.js";
import authorizeRoles from "../middleware/role.middleware.js";
import {
	getDashboardStats,
	getTeamMetrics,
} from "../controllers/dashboardController.js";

const router = express.Router();

router.get("/stats", protect, getDashboardStats);
router.get("/team-metrics", protect, authorizeRoles("MANAGER", "ADMIN"), getTeamMetrics);

export default router;